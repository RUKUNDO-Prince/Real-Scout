const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let buyer, seller, inspector, lender;
    let realEstate, escrow;

    beforeEach(async () => {
        // SETUP ACCOUNTS
        [buyer, seller, inspector, lender] = await ethers.getSigners();
        
        // DEPLOY REAL-ESTATE
        const RealEstate = await ethers.getContractFactory("RealEstate");
        realEstate = await RealEstate.deploy();

        // MINT
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS");
        await transaction.wait();

        const Escrow = await ethers.getContractFactory("Escrow");
        escrow = await Escrow.deploy(
            realEstate.address,
            seller.address,
            inspector.address,
            lender.address
        );

        // APPROVE PROPERTY
        transaction = await realEstate.connect(seller).approve(escrow.address, 1);
        await transaction.wait();

        // LIST PROPERTY
        transaction = await escrow.connect(seller).list(1, buyer.address, tokens(10), tokens(5));
        await transaction.wait(); 
    });
    
    describe('Deployment', () => {
        it('Returns NFT Address', async () => {
            const result = await escrow.nftAddress();
            expect(result).to.be.equal(realEstate.address);
        });

        it('Returns Seller', async () => {
            const result = await escrow.seller();
            expect(result).to.be.equal(seller.address);
        });

        it('Returns Inspector', async () => {
            const result = await escrow.inspector();
            expect(result).to.be.equal(inspector.address);
        });

        it('Returns Lender', async () => {
            const result = await escrow.lender();
            expect(result).to.be.equal(lender.address);
        });
    });

    describe('Listing', () => {
        it('Updates As Listed', async () => {
            const result = await escrow.isListed(1);
            expect(result).to.be.equal(true);
        });

        it('Updates Ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
        });

        it("Returns Buyer", async () => {
            const result = await escrow.buyer(1);
            expect(result).to.be.equal(buyer.address);
        });

        it("Returns Purchase Price", async () => {
            const result = await escrow.purchasePrice(1);
            expect(result).to.be.equal(tokens(10));
        });

        it("Returns Escrow Amount", async () => {
            const result = await escrow.escrowAmount(1);
            expect(result).to.be.equal(tokens(5));
        });
    });

    describe("Deposits", () => {
        it("Updates Contract Balance", async () => {
            const transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) });
            await transaction.wait();
            const result = await escrow.getBalance();
            expect(result).to.be.equal(tokens(5));
        });
    });

    describe("Inspection", () => {
        it("Updates Inspection Status", async () => {
            const transaction = await escrow.connect(inspector).updateInspectionStatus(1, true);
            await transaction.wait();
            const result = await escrow.inspectionPassed(1);
            expect(result).to.be.equal(true);
        });
    });

    describe("Approval", () => {
        it("Updates Approval Status", async () => {
            let transaction = await escrow.connect(buyer).approveSale(1);
            await transaction.wait();
            
            transaction = await escrow.connect(seller).approveSale(1);
            await transaction.wait();

            transaction = await escrow.connect(lender).approveSale(1);
            await transaction.wait();

            expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
            expect(await escrow.approval(1, seller.address)).to.be.equal(true);
            expect(await escrow.approval(1, lender.address)).to.be.equal(true);
        });
    });
})
