// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BatchNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    struct BatchData {
        string batchId;
        string medicineName;
        string activeIngredient;
        string dosage;
        string manufacturer;
        string cdscoCertificate;
        uint256 manufacturingDate;
        uint256 expiryDate;
        string status; // active, revoked, expired
        address mintedBy;
    }

    mapping(uint256 => BatchData) public batches;
    mapping(string => uint256) public batchIdToToken;

    event BatchMinted(uint256 tokenId, string batchId, string medicineName, address mintedBy);
    event BatchRevoked(string batchId, address revokedBy);
    event BatchExpired(string batchId);

    constructor() ERC721("MediTraceBatch", "MTB") {}

    function mintBatch(
        string memory batchId,
        string memory medicineName,
        string memory activeIngredient,
        string memory dosage,
        string memory manufacturer,
        string memory cdscoCertificate,
        uint256 manufacturingDate,
        uint256 expiryDate
    ) public onlyOwner {
        require(batchIdToToken[batchId] == 0, "Batch already minted");

        _tokenIds++;
        uint256 newItemId = _tokenIds;

        _mint(msg.sender, newItemId);

        batches[newItemId] = BatchData({
            batchId: batchId,
            medicineName: medicineName,
            activeIngredient: activeIngredient,
            dosage: dosage,
            manufacturer: manufacturer,
            cdscoCertificate: cdscoCertificate,
            manufacturingDate: manufacturingDate,
            expiryDate: expiryDate,
            status: "active",
            mintedBy: msg.sender
        });

        batchIdToToken[batchId] = newItemId;

        emit BatchMinted(newItemId, batchId, medicineName, msg.sender);
    }

    function getBatch(string memory batchId) public view returns (BatchData memory) {
        uint256 tokenId = batchIdToToken[batchId];
        require(tokenId != 0, "Batch not found");
        return batches[tokenId];
    }

    function revokeBatch(string memory batchId) public onlyOwner {
        uint256 tokenId = batchIdToToken[batchId];
        require(tokenId != 0, "Batch not found");
        batches[tokenId].status = "revoked";
        emit BatchRevoked(batchId, msg.sender);
    }

    function markExpired(string memory batchId) public onlyOwner {
        uint256 tokenId = batchIdToToken[batchId];
        require(tokenId != 0, "Batch not found");
        batches[tokenId].status = "expired";
        emit BatchExpired(batchId);
    }

    function isBatchValid(string memory batchId) public view returns (bool) {
        uint256 tokenId = batchIdToToken[batchId];
        if (tokenId == 0) return false;
        
        BatchData memory batch = batches[tokenId];
        bool isActive = keccak256(abi.encodePacked(batch.status)) == keccak256(abi.encodePacked("active"));
        bool isNotExpired = batch.expiryDate > block.timestamp;
        
        return isActive && isNotExpired;
    }
}
