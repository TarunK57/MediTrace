// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ColdChainLogger is Ownable {
    struct TempReading {
        string batchId;
        int256 temperature;
        string location;
        string sensorId;
        uint256 timestamp;
        bool isAnomaly;
    }

    mapping(string => TempReading[]) public readings;
    mapping(string => bool) public batchBreached;

    event TemperatureLogged(string batchId, int256 temperature, string sensorId, uint256 timestamp);
    event BreachDetected(string batchId, int256 temperature, uint256 timestamp);

    function logTemperature(
        string memory batchId,
        int256 temperature,
        string memory location,
        string memory sensorId,
        bool isAnomaly
    ) public {
        readings[batchId].push(TempReading({
            batchId: batchId,
            temperature: temperature,
            location: location,
            sensorId: sensorId,
            timestamp: block.timestamp,
            isAnomaly: isAnomaly
        }));

        if (isAnomaly) {
            batchBreached[batchId] = true;
            emit BreachDetected(batchId, temperature, block.timestamp);
        }

        emit TemperatureLogged(batchId, temperature, sensorId, block.timestamp);
    }

    function getReadings(string memory batchId) public view returns (TempReading[] memory) {
        return readings[batchId];
    }

    function isBreached(string memory batchId) public view returns (bool) {
        return batchBreached[batchId];
    }

    function getLatestTemperature(string memory batchId) public view returns (int256) {
        uint256 len = readings[batchId].length;
        if (len == 0) return 0;
        return readings[batchId][len - 1].temperature;
    }
}
