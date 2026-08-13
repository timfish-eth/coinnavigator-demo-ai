// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MembershipPass
 * @notice Monthly stablecoin subscription contract.
 *
 * Users pay a fixed amount of stablecoin per month to become a member.
 * Membership can be purchased or renewed at any time; the expiry is extended
 * by the purchased number of months from the current expiry (or now if expired).
 */
contract MembershipPass is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice ERC20 token used for payments (e.g., USDT/BUSD).
    IERC20 public paymentToken;

    /// @notice Price per month in `paymentToken` decimals.
    uint256 public monthlyPrice;

    /// @notice Duration of one subscription period.
    uint256 public constant SUBSCRIPTION_DURATION = 30 days;

    /// @notice Expiry timestamp per account. 0 means never subscribed.
    mapping(address => uint256) public membershipExpiry;

    event MembershipPurchased(
        address indexed account,
        uint256 months,
        uint256 totalAmount,
        uint256 expiry
    );

    event MonthlyPriceUpdated(uint256 newPrice);
    event PaymentTokenUpdated(address indexed newToken);
    event FundsWithdrawn(address indexed token, uint256 amount);

    constructor(
        address initialOwner,
        address _paymentToken,
        uint256 _monthlyPrice
    ) Ownable(initialOwner) {
        require(_paymentToken != address(0), "Invalid payment token");
        require(_monthlyPrice > 0, "Invalid monthly price");
        paymentToken = IERC20(_paymentToken);
        monthlyPrice = _monthlyPrice;
    }

    /**
     * @notice Purchase or renew membership for a number of months.
     * @param months Number of months to subscribe.
     */
    function purchaseMembership(uint256 months) public nonReentrant {
        require(months > 0, "Months must be > 0");
        uint256 totalAmount = monthlyPrice * months;
        paymentToken.safeTransferFrom(msg.sender, address(this), totalAmount);

        uint256 currentExpiry = membershipExpiry[msg.sender];
        uint256 base = currentExpiry > block.timestamp ? currentExpiry : block.timestamp;
        uint256 newExpiry = base + (months * SUBSCRIPTION_DURATION);
        membershipExpiry[msg.sender] = newExpiry;

        emit MembershipPurchased(msg.sender, months, totalAmount, newExpiry);
    }

    /**
     * @notice Recharge one month of membership.
     */
    function recharge() external {
        purchaseMembership(1);
    }

    /**
     * @notice Convenience alias for `purchaseMembership`.
     */
    function renewMembership(uint256 months) external {
        purchaseMembership(months);
    }

    /**
     * @notice Check whether an account currently holds an active membership.
     */
    function isMember(address account) external view returns (bool) {
        return membershipExpiry[account] > block.timestamp;
    }

    /**
     * @notice Return the membership expiry timestamp for an account.
     */
    function getMembershipExpiry(address account) external view returns (uint256) {
        return membershipExpiry[account];
    }

    /**
     * @notice Owner: update the monthly price.
     */
    function setMonthlyPrice(uint256 _monthlyPrice) external onlyOwner {
        require(_monthlyPrice > 0, "Invalid monthly price");
        monthlyPrice = _monthlyPrice;
        emit MonthlyPriceUpdated(_monthlyPrice);
    }

    /**
     * @notice Owner: update the accepted payment token.
     */
    function setPaymentToken(address _paymentToken) external onlyOwner {
        require(_paymentToken != address(0), "Invalid payment token");
        paymentToken = IERC20(_paymentToken);
        emit PaymentTokenUpdated(_paymentToken);
    }

    /**
     * @notice Owner: withdraw collected tokens.
     */
    function withdrawFunds(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        paymentToken.safeTransfer(owner(), amount);
        emit FundsWithdrawn(address(paymentToken), amount);
    }
}
