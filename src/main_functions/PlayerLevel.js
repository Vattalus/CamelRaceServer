handlers.claimLevelUpReward = function (args, context) {
    //First off, load the player's level progress from read-only data
    var playerLevelProgress = loadTitleDataJson("LevelProgress");

    if (playerLevelProgress == undefined || playerLevelProgress == null)
        return generateErrObj("LevelProgress JSON undefined or null");

    //check if player is eligible for level up reward
    if (Number(playerLevelProgress.LastLevelReward) >= Number(playerLevelProgress.Level))
        return generateFailObj("Player not eligible for level up reward");

    //now, load the level up rewards from title data
    var levelsBalancingJSON = loadTitleDataJson("Balancing_PlayerLevels");

    if (levelsBalancingJSON == undefined || levelsBalancingJSON == null || levelsBalancingJSON.length == 0)
        return generateFailObj("Failed to load level rewards data");

    var levelRewardsObject = levelsBalancingJSON[Number(playerLevelProgress.LastLevelReward)];

    //increment virtual currency
    addCurrency("SC", levelRewardsObject.RewardSC);
    addCurrency("HC", levelRewardsObject.RewardHC);
    addCurrency("TK", levelRewardsObject.RewardTK);

    //increment the LastLevelReward
    playerLevelProgress.LastLevelReward = Number(playerLevelProgress.LastLevelReward) + 1;

    //update the player's read-only data
    server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "LevelProgress": playerLevelProgress }
        }
    );

    return {
        Result: "OK",
        VirtualCurrency: server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency
    }
}
