// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract HandoffLogger is Ownable {
    struct Handoff {
        string batchId;
        string fromEntity;
        string toEntity;
        string fromName;
        string toName;
        string qrToken;
        uint256 timestamp;
        int256 locationLat;
        int256 locationLng;
    }

    mapping(string => Handoff[]) public handoffs;

    event HandoffLogged(string batchId, string fromEntity, string toEntity, uint256 timestamp);

    function logHandoff(
        string memory batchId,
        string memory fromEntity,
        string memory toEntity,
        string memory fromName,
        string memory toName,
        string memory qrToken,
        int256 locationLat,
        int256 locationLng
    ) public {
        handoffs[batchId].push(Handoff({
            batchId: batchId,
            fromEntity: fromEntity,
            toEntity: toEntity,
            fromName: fromName,
            toName: toName,
            qrToken: qrToken,
            timestamp: block.timestamp,
            locationLat: locationLat,
            locationLng: locationLng
        }));

        emit HandoffLogged(batchId, fromEntity, toEntity, block.timestamp);
    }

    function getHandoffs(string memory batchId) public view returns (Handoff[] memory) {
        return handoffs[batchId];
    }

    function getHandoffCount(string memory batchId) public view returns (uint256) {
        return handoffs[batchId].length;
    }
}
