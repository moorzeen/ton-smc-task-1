import {Blockchain, printTransactionFees, SandboxContract, TreasuryContract} from '@ton/sandbox';
import {address, Cell, loadDepthBalanceInfo, toNano} from '@ton/core';
import { AcceptFundsContract } from '../wrappers/AcceptFundsContract';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('AcceptFundsContract', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('AcceptFundsContract');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let acceptFundsContract: SandboxContract<AcceptFundsContract>;
    let admin: SandboxContract<TreasuryContract>
    let user: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        admin = await blockchain.treasury('admin');
        user = await blockchain.treasury('user');

        acceptFundsContract = blockchain.openContract(AcceptFundsContract.createFromConfig({
            min_accept: 2_000_000_000,
            min_store: 500_000_000 + 40_000_000,
            admin: admin.address
        }, code));

        deployer = await blockchain.treasury('deployer');
        const deployResult = await acceptFundsContract.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: acceptFundsContract.address,
            deploy: true,
            success: true,
        });
    });

    it('should bounce: send < 2 TON', async () => {
        let contract = await blockchain.getContract(acceptFundsContract.address)
        let contractBalanceBefore = contract.balance
        let userBalanceBefore = await user.getBalance();

        await blockchain.setVerbosityForAddress(contract.address, {
            blockchainLogs: false,
            vmLogs: "vm_logs_full",
            debugLogs: false,
            print: true
        })

        const sendAcceptFundsResult = await acceptFundsContract.sendAcceptFunds(user.getSender(), toNano('1.9'));
        expect(sendAcceptFundsResult.transactions).toHaveTransaction({
            from: user.address,
            to: acceptFundsContract.address,
            success: false,
            op: 0xA4D8086F,
            outMessagesCount: 1,
            value: toNano('1.9'),
        })

        expect(sendAcceptFundsResult.transactions).toHaveTransaction({
            from: acceptFundsContract.address,
            to: user.address,
            inMessageBounced: true
        })

        let contractBalanceAfter = contract.balance
        let userBalanceAfter = await user.getBalance();
        expect(contractBalanceAfter).toEqual(contractBalanceBefore);
        expect(userBalanceAfter).toBeGreaterThan(userBalanceBefore-toNano('0.003'));

        printTransactionFees(sendAcceptFundsResult.transactions);
    });

    it('should accept funds: send >= 2 TON', async () => {
        let contract = await blockchain.getContract(acceptFundsContract.address)
        let contractBalanceBefore = contract.balance
        let userBalanceBefore = await user.getBalance();

        const sendAcceptFundsResult = await acceptFundsContract.sendAcceptFunds(user.getSender(), toNano('2'));
        expect(sendAcceptFundsResult.transactions).toHaveTransaction({
            from: user.address,
            to: acceptFundsContract.address,
            success: true,
            op: 0xA4D8086F,
            outMessagesCount: 0,
            value: toNano('2'),
        })

        let contractBalanceAfter =  contract.balance
        let userBalanceAfter = await user.getBalance();
        expect(contractBalanceAfter).toBeGreaterThan(contractBalanceBefore);
        expect(userBalanceAfter).toBeLessThan(userBalanceBefore);

        printTransactionFees(sendAcceptFundsResult.transactions);
    });

    it('should withdraw funds', async () => {
        const sendAcceptFundsResult = await acceptFundsContract.sendAcceptFunds(user.getSender(), toNano('5'));
        printTransactionFees(sendAcceptFundsResult.transactions);

        let contract = await blockchain.getContract(acceptFundsContract.address)
        let contractBalanceBefore = contract.balance
        let adminBalanceBefore = await admin.getBalance();

        const sendWithdrawFundsResult = await acceptFundsContract.sendWithdrawFunds(admin.getSender());
        expect(sendWithdrawFundsResult.transactions).toHaveTransaction({
            from: admin.address,
            to: acceptFundsContract.address,
            success: true,
            op: 0x217E5898,
        })

        expect(sendWithdrawFundsResult.transactions).toHaveTransaction({
            from: acceptFundsContract.address,
            to: admin.address,
            success: true,
        })

        let contractBalanceAfter =  contract.balance
        let adminBalanceAfter = await admin.getBalance();
        expect(contractBalanceAfter).toBeLessThan(contractBalanceBefore);
        expect(contractBalanceAfter).toBeGreaterThan(toNano('0.5'));
        expect(adminBalanceAfter).toBeGreaterThan(adminBalanceBefore);

        printTransactionFees(sendWithdrawFundsResult.transactions);
    });

    it('should bounce not admin withdraw', async () => {
        const sendWithdrawFundsResult = await acceptFundsContract.sendWithdrawFunds(user.getSender());
        expect(sendWithdrawFundsResult.transactions).toHaveTransaction({
            from: acceptFundsContract.address,
            to: user.address,
            inMessageBounced: true
        })
    });
});
