// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TrustMesh
 * @dev Decentralized trust network and credential verification registry.
 * Implements claim creation, verifier authorization, on-chain verification,
 * rejection with reason, and verifiable status tracking.
 */
contract TrustMesh {
    enum ClaimStatus { PENDING, VERIFIED, REJECTED, REVOKED }

    struct Claim {
        uint256 id;
        address claimant;
        string claimType;
        string referenceHash; // SHA-256 / off-chain pointer
        ClaimStatus status;
        address verifier;
        uint256 timestamp;
    }

    address public owner;
    uint256 public claimCounter;

    mapping(uint256 => Claim) public claims;
    mapping(address => uint256[]) public userClaims;
    mapping(address => bool) public authorizedVerifiers;
    mapping(address => bool) public registeredProfiles;

    // Canonical events from TrustMesh specification
    event ProfileRegistered(address indexed user, uint256 timestamp);
    event ClaimCreated(uint256 indexed claimId, address indexed claimant, uint256 timestamp);
    event VerificationRequested(uint256 indexed claimId, address indexed claimant, uint256 timestamp);
    event ClaimVerified(uint256 indexed claimId, address indexed claimant, address indexed verifier, uint256 timestamp);
    event ClaimRejected(uint256 indexed claimId, address indexed claimant, address indexed verifier, string reason, uint256 timestamp);
    event VerificationRevoked(uint256 indexed claimId, address indexed verifier, uint256 timestamp);
    event VerifierRegistered(address indexed verifier, uint256 timestamp);
    event VerifierRevoked(address indexed verifier, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorizedVerifier() {
        require(authorizedVerifiers[msg.sender], "Not authorized verifier");
        _;
    }

    modifier onlyClaimant(uint256 claimId) {
        require(claims[claimId].claimant == msg.sender, "Not claimant");
        _;
    }

    modifier validClaim(uint256 claimId) {
        require(claimId > 0 && claimId <= claimCounter, "Invalid claim ID");
        _;
    }

    constructor() {
        owner = msg.sender;
        // Deployer is authorized as initial verifier to facilitate testing and bootstrap
        authorizedVerifiers[msg.sender] = true;
        emit VerifierRegistered(msg.sender, block.timestamp);
    }

    /**
     * @dev Register profile owner wallet on-chain.
     */
    function registerProfile() external {
        registeredProfiles[msg.sender] = true;
        emit ProfileRegistered(msg.sender, block.timestamp);
    }

    /**
     * @dev Create a new claim with evidence hash reference.
     * @param claimType Category/type of claim (e.g., Skill, Experience, Project).
     * @param referenceHash SHA-256 evidence hash or off-chain pointer.
     */
    function createClaim(
        string calldata claimType,
        string calldata referenceHash
    ) external returns (uint256) {
        require(bytes(claimType).length > 0, "Claim type cannot be empty");
        require(bytes(referenceHash).length > 0, "Reference hash cannot be empty");

        claimCounter++;
        claims[claimCounter] = Claim({
            id: claimCounter,
            claimant: msg.sender,
            claimType: claimType,
            referenceHash: referenceHash,
            status: ClaimStatus.PENDING,
            verifier: address(0),
            timestamp: block.timestamp
        });

        userClaims[msg.sender].push(claimCounter);

        emit ClaimCreated(claimCounter, msg.sender, block.timestamp);
        return claimCounter;
    }

    /**
     * @dev Claimant requests verification for their pending claim.
     * @param claimId ID of the claim.
     */
    function requestVerification(uint256 claimId) external validClaim(claimId) onlyClaimant(claimId) {
        require(claims[claimId].status == ClaimStatus.PENDING, "Claim is not pending");
        emit VerificationRequested(claimId, msg.sender, block.timestamp);
    }

    /**
     * @dev Authorized verifier approves and verifies a pending claim.
     * @param claimId ID of the claim to verify.
     */
    function verifyClaim(uint256 claimId) external validClaim(claimId) onlyAuthorizedVerifier {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.PENDING, "Claim is not pending");

        claim.status = ClaimStatus.VERIFIED;
        claim.verifier = msg.sender;
        claim.timestamp = block.timestamp;

        emit ClaimVerified(claimId, claim.claimant, msg.sender, block.timestamp);
    }

    /**
     * @dev Authorized verifier rejects a pending claim with a documented reason.
     * @param claimId ID of the claim to reject.
     * @param reason Explanation for rejection.
     */
    function rejectClaim(
        uint256 claimId,
        string calldata reason
    ) external validClaim(claimId) onlyAuthorizedVerifier {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.PENDING, "Claim is not pending");

        claim.status = ClaimStatus.REJECTED;
        claim.verifier = msg.sender;
        claim.timestamp = block.timestamp;

        emit ClaimRejected(claimId, claim.claimant, msg.sender, reason, block.timestamp);
    }

    /**
     * @dev Authorized verifier revokes a previously verified claim.
     * Preserves historic data on-chain while setting status to REVOKED.
     * @param claimId ID of the claim to revoke.
     */
    function revokeVerification(uint256 claimId) external validClaim(claimId) onlyAuthorizedVerifier {
        Claim storage claim = claims[claimId];
        require(claim.status == ClaimStatus.VERIFIED, "Claim is not verified");

        claim.status = ClaimStatus.REVOKED;
        claim.timestamp = block.timestamp;

        emit VerificationRevoked(claimId, msg.sender, block.timestamp);
    }

    /**
     * @dev Retrieve claim details by ID.
     * @param claimId ID of the claim.
     */
    function getClaim(uint256 claimId) external view validClaim(claimId) returns (Claim memory) {
        return claims[claimId];
    }

    /**
     * @dev Retrieve all claim IDs created by a specific user address.
     * @param user Address of the claimant.
     */
    function getUserClaims(address user) external view returns (uint256[] memory) {
        return userClaims[user];
    }

    /**
     * @dev Authorize a verifier (owner only).
     * @param verifier Address to grant verifier authorization.
     */
    function registerVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        authorizedVerifiers[verifier] = true;
        emit VerifierRegistered(verifier, block.timestamp);
    }

    /**
     * @dev Alias for registerVerifier for API consistency.
     * @param verifier Address to authorize.
     */
    function authorizeVerifier(address verifier) external onlyOwner {
        require(verifier != address(0), "Invalid verifier address");
        authorizedVerifiers[verifier] = true;
        emit VerifierRegistered(verifier, block.timestamp);
    }

    /**
     * @dev Revoke an authorized verifier (owner only).
     * @param verifier Address to deauthorize.
     */
    function revokeVerifier(address verifier) external onlyOwner {
        require(authorizedVerifiers[verifier], "Verifier not authorized");
        authorizedVerifiers[verifier] = false;
        emit VerifierRevoked(verifier, block.timestamp);
    }
}
