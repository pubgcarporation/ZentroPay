// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ZentroPay
/// @notice USDC invoices with a due date, paid in full directly to the invoice creator.
/// @dev Intended for Arc Testnet (chain 5042002), with USDC at
/// 0x3600000000000000000000000000000000000000. Amounts use USDC's 6-decimal
/// ERC-20 units. The constructor selects the immutable token; the chain is not enforced.
/// Payments may be made before, at, or after due date. No native-value payment path,
/// escrow, fees, administrator, or upgrade mechanism is provided. Unsolicited token
/// transfers cannot be prevented and there is no recovery function.
contract ZentroPay is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Lifecycle of a payment request; Paid and Cancelled are terminal.
    enum Status { Open, Paid, Cancelled }

    /// @notice A full-amount payment request; zero payer means anyone may pay.
    /// @dev Timestamps are Unix seconds; paidAt and paidBy are zero until paid.
    struct Invoice {
        address payee;
        address payer;
        uint256 amount;
        uint64 dueDate;
        uint256 createdAt;
        uint256 paidAt;
        address paidBy;
        Status status;
        string memo;
    }

    /// @notice Maximum UTF-8 memo length in bytes, not characters.
    uint256 public constant MAX_MEMO_BYTES = 140;

    /// @notice Immutable ERC-20 USDC used for every payment.
    IERC20 public immutable usdc;

    uint256 private _invoiceCount;
    mapping(uint256 => Invoice) private _invoices;
    mapping(address => uint256[]) private _payeeInvoiceIds;
    mapping(address => uint256[]) private _payerInvoiceIds;

    error InvalidUSDC(address token);
    error ZeroAmount();
    error InvalidDueDate(uint64 dueDate);
    error MemoTooLong(uint256 length);
    error PayeeCannotBePayer();
    error InvoiceNotFound(uint256 id);
    error InvoiceNotOpen(uint256 id, Status status);
    error UnauthorizedPayer(address caller, address requiredPayer);
    error UnauthorizedPayee(address caller, address payee);
    error UnexpectedReceivedAmount(uint256 expected, uint256 received);

    /// @notice Emitted when a new invoice is created; payer zero denotes an open request.
    event InvoiceCreated(
        uint256 indexed id,
        address indexed payee,
        address indexed payer,
        uint256 amount,
        uint64 dueDate,
        uint256 createdAt,
        string memo
    );

    /// @notice Emitted after the payee receives the full amount.
    event InvoicePaid(
        uint256 indexed id,
        address indexed payee,
        address indexed paidBy,
        uint256 amount,
        uint256 paidAt
    );

    /// @notice Emitted when the payee cancels an open request.
    event InvoiceCancelled(uint256 indexed id, address indexed payee);

    /// @param usdcAddress USDC ERC-20 contract; use the documented address on Arc Testnet.
    constructor(address usdcAddress) {
        if (usdcAddress == address(0) || usdcAddress.code.length == 0) {
            revert InvalidUSDC(usdcAddress);
        }
        usdc = IERC20(usdcAddress);
    }

    /// @notice Create an invoice payable directly to the caller.
    /// @param payer Named payer, or zero to allow anyone other than the payee to pay.
    /// @param amount Full USDC amount in 6-decimal base units; must be positive.
    /// @param dueDate Maturity timestamp, strictly in the future at creation.
    /// @param memo Description limited to MAX_MEMO_BYTES bytes.
    /// @return id Sequential identifier, starting at one.
    function createInvoice(address payer, uint256 amount, uint64 dueDate, string calldata memo)
        external
        nonReentrant
        returns (uint256 id)
    {
        if (payer == msg.sender) revert PayeeCannotBePayer();
        if (amount == 0) revert ZeroAmount();
        if (dueDate <= block.timestamp) revert InvalidDueDate(dueDate);
        if (bytes(memo).length > MAX_MEMO_BYTES) revert MemoTooLong(bytes(memo).length);

        id = ++_invoiceCount;
        _invoices[id] = Invoice({
            payee: msg.sender,
            payer: payer,
            amount: amount,
            dueDate: dueDate,
            createdAt: block.timestamp,
            paidAt: 0,
            paidBy: address(0),
            status: Status.Open,
            memo: memo
        });
        _payeeInvoiceIds[msg.sender].push(id);
        if (payer != address(0)) _payerInvoiceIds[payer].push(id);

        emit InvoiceCreated(id, msg.sender, payer, amount, dueDate, block.timestamp, memo);
    }

    /// @notice Pay an open invoice in full, including after its due date.
    /// @dev Requires prior allowance to this contract. Effects precede token calls;
    /// any transfer failure or non-exact payee balance increase reverts all effects.
    /// The contract never takes custody of the payment.
    /// @param id Existing invoice identifier.
    function payInvoice(uint256 id) external nonReentrant {
        Invoice storage invoice = _existingInvoice(id);
        if (invoice.status != Status.Open) revert InvoiceNotOpen(id, invoice.status);
        if (invoice.payer != address(0) && invoice.payer != msg.sender) {
            revert UnauthorizedPayer(msg.sender, invoice.payer);
        }
        if (msg.sender == invoice.payee) revert PayeeCannotBePayer();

        address payee = invoice.payee;
        uint256 amount = invoice.amount;
        invoice.status = Status.Paid;
        invoice.paidAt = block.timestamp;
        invoice.paidBy = msg.sender;

        uint256 beforeBalance = usdc.balanceOf(payee);
        usdc.safeTransferFrom(msg.sender, payee, amount);
        uint256 afterBalance = usdc.balanceOf(payee);
        uint256 received = afterBalance >= beforeBalance ? afterBalance - beforeBalance : 0;
        if (received != amount) revert UnexpectedReceivedAmount(amount, received);

        emit InvoicePaid(id, payee, msg.sender, amount, block.timestamp);
    }

    /// @notice Cancel an open invoice; only its creator may cancel it.
    /// @param id Existing invoice identifier.
    function cancelInvoice(uint256 id) external nonReentrant {
        Invoice storage invoice = _existingInvoice(id);
        if (msg.sender != invoice.payee) revert UnauthorizedPayee(msg.sender, invoice.payee);
        if (invoice.status != Status.Open) revert InvoiceNotOpen(id, invoice.status);
        invoice.status = Status.Cancelled;
        emit InvoiceCancelled(id, msg.sender);
    }

    /// @notice Return all details of an existing invoice; unknown IDs revert.
    function getInvoice(uint256 id) external view returns (Invoice memory) {
        return _existingInvoice(id);
    }

    /// @notice Total invoices created, including paid and cancelled invoices.
    function invoiceCount() external view returns (uint256) {
        return _invoiceCount;
    }

    /// @notice Return every invoice created by a payee in creation order.
    /// @dev Unpaginated; response size grows with the payee's history.
    function getPayeeInvoiceIds(address payee) external view returns (uint256[] memory) {
        return _payeeInvoiceIds[payee];
    }

    /// @notice Return invoices naming this payer, regardless of current status.
    /// @dev Open-to-anyone invoices are excluded, including for address zero.
    /// Unpaginated; use IDs or events for large histories.
    function getPayerInvoiceIds(address payer) external view returns (uint256[] memory) {
        return _payerInvoiceIds[payer];
    }

    /// @notice Whether an existing invoice is open and strictly past due date.
    /// @dev Paid and cancelled invoices are never overdue; unknown IDs revert.
    function isOverdue(uint256 id) external view returns (bool) {
        Invoice storage invoice = _existingInvoice(id);
        return invoice.status == Status.Open && block.timestamp > invoice.dueDate;
    }

    /// @dev IDs start at one; no requests are deleted.
    function _existingInvoice(uint256 id) private view returns (Invoice storage invoice) {
        if (id == 0 || id > _invoiceCount) revert InvoiceNotFound(id);
        return _invoices[id];
    }
}
