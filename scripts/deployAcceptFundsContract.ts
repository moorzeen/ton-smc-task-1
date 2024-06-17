import { toNano } from '@ton/core';
import { AcceptFundsContract } from '../wrappers/AcceptFundsContract';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const acceptFundsContract = provider.open(AcceptFundsContract.createFromConfig({}, await compile('AcceptFundsContract')));

    await acceptFundsContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(acceptFundsContract.address);

    // run methods on `acceptFundsContract`
}
