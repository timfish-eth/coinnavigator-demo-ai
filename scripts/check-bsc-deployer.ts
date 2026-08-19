import hre from "hardhat"

const { ethers } = hre

async function main() {
  const [deployer] = await ethers.getSigners()
  const network = await ethers.provider.getNetwork()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`Network chainId: ${network.chainId}`)
  console.log(`Deployer: ${deployer.address}`)
  console.log(`BNB balance: ${ethers.formatEther(balance)}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
