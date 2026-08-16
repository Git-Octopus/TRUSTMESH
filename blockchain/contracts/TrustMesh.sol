// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TrustMesh {
    address public owner;

    struct Claim {
        uint256 id;
        address claimant;
        string evidenceHash;
        bool isVerified;
    }

    mapping(uint256 => Claim) public claims;
    uint256 public claimCount;

    event ClaimCreated(uint256 indexed id, address indexed claimant, string evidenceHash);
    event ClaimVerified(uint256 indexed id, address indexed verifier, bool approved);

    constructor() {
        owner = msg.sender;
    }

    function createClaim(string memory _evidenceHash) external returns (uint256) {
        claimCount++;
        claims[claimCount] = Claim(claimCount, msg.sender, _evidenceHash, false);
        emit ClaimCreated(claimCount, msg.sender, _evidenceHash);
        return claimCount;
    }

    function verifyClaim(uint256 _claimId, bool _approved) external {
        require(_claimId > 0 && _claimId <= claimCount, "Invalid claim ID");
        claims[_claimId].isVerified = _approved;
        emit ClaimVerified(_claimId, msg.sender, _approved);
    }
}
