import { expect } from "chai"
import hre from "hardhat"
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers.js"
import { ZeroAddress } from "ethers"

const { ethers, network } = hre

const MONTHLY_PRICE = ethers.parseUnits("9.9", 18)
const ONE_MONTH = 30n * 24n * 60n * 60n

async function deployFixture() {
  const [owner, alice, bob] = await ethers.getSigners()

  const Token = await ethers.getContractFactory("MockERC20")
  const token = await Token.deploy("Mock USDT", "mUSDT", 18)

  const Membership = await ethers.getContractFactory("MembershipPass")
  const membership = await Membership.deploy(owner.address, await token.getAddress(), MONTHLY_PRICE)

  await token.mint(alice.address, ethers.parseUnits("1000", 18))
  await token.mint(bob.address, ethers.parseUnits("1000", 18))

  return { owner, alice, bob, token, membership }
}

describe("MembershipPass", () => {
  it("deploys with correct initial state", async () => {
    const { token, membership } = await loadFixture(deployFixture)
    expect(await membership.paymentToken()).to.equal(await token.getAddress())
    expect(await membership.monthlyPrice()).to.equal(MONTHLY_PRICE)
  })

  it("allows a user to purchase membership", async () => {
    const { alice, token, membership } = await loadFixture(deployFixture)

    await token.connect(alice).approve(await membership.getAddress(), ethers.parseUnits("100", 18))
    await membership.connect(alice).purchaseMembership(3)

    expect(await membership.isMember(alice.address)).to.equal(true)
    expect(await membership.getMembershipExpiry(alice.address)).to.be.greaterThan(0)
  })

  it("requires payment to purchase membership", async () => {
    const { alice, membership } = await loadFixture(deployFixture)
    await expect(membership.connect(alice).purchaseMembership(1)).to.be.reverted
  })

  it("extends expiry on renewal", async () => {
    const { alice, token, membership } = await loadFixture(deployFixture)

    await token.connect(alice).approve(await membership.getAddress(), ethers.parseUnits("100", 18))
    await membership.connect(alice).purchaseMembership(1)

    const firstExpiry = await membership.getMembershipExpiry(alice.address)
    await network.provider.send("evm_increaseTime", [Number(ONE_MONTH / 2n)])
    await network.provider.send("evm_mine")

    await membership.connect(alice).renewMembership(2)
    const secondExpiry = await membership.getMembershipExpiry(alice.address)

    expect(secondExpiry).to.be.greaterThan(firstExpiry)
    expect(await membership.isMember(alice.address)).to.equal(true)
  })

  it("reports non-member after expiry", async () => {
    const { alice, token, membership } = await loadFixture(deployFixture)

    await token.connect(alice).approve(await membership.getAddress(), ethers.parseUnits("100", 18))
    await membership.connect(alice).purchaseMembership(1)

    await network.provider.send("evm_increaseTime", [Number(ONE_MONTH) + 1])
    await network.provider.send("evm_mine")

    expect(await membership.isMember(alice.address)).to.equal(false)
  })

  it("allows owner to update price and withdraw", async () => {
    const { owner, alice, token, membership } = await loadFixture(deployFixture)

    await token.connect(alice).approve(await membership.getAddress(), ethers.parseUnits("100", 18))
    await membership.connect(alice).purchaseMembership(1)

    const newPrice = ethers.parseUnits("19.9", 18)
    await membership.connect(owner).setMonthlyPrice(newPrice)
    expect(await membership.monthlyPrice()).to.equal(newPrice)

    const balanceBefore = await token.balanceOf(owner.address)
    await membership.connect(owner).withdrawFunds(MONTHLY_PRICE)
    const balanceAfter = await token.balanceOf(owner.address)
    expect(balanceAfter - balanceBefore).to.equal(MONTHLY_PRICE)
  })

  it("uses the admin-updated monthly price for new purchases", async () => {
    const { owner, alice, token, membership } = await loadFixture(deployFixture)
    const newPrice = ethers.parseUnits("19.9", 18)

    await expect(membership.connect(owner).setMonthlyPrice(newPrice))
      .to.emit(membership, "MonthlyPriceUpdated")
      .withArgs(newPrice)
    expect(await membership.monthlyPrice()).to.equal(newPrice)

    await token.connect(alice).approve(await membership.getAddress(), ethers.parseUnits("100", 18))
    const balanceBefore = await token.balanceOf(alice.address)
    await membership.connect(alice).purchaseMembership(2)
    const balanceAfter = await token.balanceOf(alice.address)

    expect(balanceBefore - balanceAfter).to.equal(newPrice * 2n)
  })

  it("rejects monthly price updates from non-admin accounts", async () => {
    const { alice, membership } = await loadFixture(deployFixture)
    const newPrice = ethers.parseUnits("19.9", 18)

    await expect(membership.connect(alice).setMonthlyPrice(newPrice))
      .to.be.revertedWithCustomError(membership, "OwnableUnauthorizedAccount")
      .withArgs(alice.address)
  })

  it("rejects invalid monthly price updates", async () => {
    const { owner, membership } = await loadFixture(deployFixture)

    await expect(membership.connect(owner).setMonthlyPrice(0)).to.be.revertedWith("Invalid monthly price")
  })

  it("rejects invalid constructor args", async () => {
    const [owner] = await ethers.getSigners()
    const Membership = await ethers.getContractFactory("MembershipPass")
    await expect(Membership.deploy(owner.address, ZeroAddress, MONTHLY_PRICE)).to.be.revertedWith(
      "Invalid payment token",
    )
  })
})
