import { test, expect } from "@playwright/test"

test("homepage connect wallet button opens RainbowKit modal", async ({ page }) => {
  await page.goto("/")

  // The header should show the connect wallet button when disconnected.
  const connectButton = page.getByRole("button", { name: /connect wallet/i })
  await expect(connectButton).toBeVisible()

  // Clicking it should open the RainbowKit connect modal.
  await connectButton.click()

  // RainbowKit renders a dialog with wallet options.
  const modal = page.locator('[role="dialog"], [data-testid="rk-connect-modal"]')
  await expect(modal).toBeVisible({ timeout: 5000 })

  // The modal should mention at least one wallet option or the connect title.
  await expect(page.getByText(/MetaMask|WalletConnect|Connect a wallet/i).first()).toBeVisible()
})
