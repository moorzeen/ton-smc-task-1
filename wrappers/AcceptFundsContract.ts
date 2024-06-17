import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano
} from '@ton/core';

export type AcceptFundsContractConfig = {
    min_accept: number;
    min_store: number;
    admin: Address;
};

export function acceptFundsContractConfigToCell(config: AcceptFundsContractConfig): Cell {
    return beginCell()
            .storeCoins(config.min_accept)
            .storeCoins(config.min_store)
            .storeAddress(config.admin)
        .endCell();
}

export class AcceptFundsContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new AcceptFundsContract(address);
    }

    static createFromConfig(config: AcceptFundsContractConfig, code: Cell, workchain = 0) {
        const data = acceptFundsContractConfigToCell(config);
        const init = { code, data };
        return new AcceptFundsContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendAcceptFunds(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value: value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xA4D8086F, 32).
            endCell(),
        })
    }

    async sendWithdrawFunds(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.02'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x217E5898, 32).
                endCell(),
        })
    }

}
