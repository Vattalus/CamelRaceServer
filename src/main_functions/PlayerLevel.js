handlers.claimLevelUpReward = function (args, context) {
    //First off, load the player's level progress from read-only data
    var playerLevelProgress = server.GetUserReadOnlyData(
{
    PlayFabId: currentPlayerId,
    Keys: ["LevelProgress"]
});

    if (playerLevelProgress == undefined || playerLevelProgress == null || playerLevelProgress.Data.LevelProgress == undefined || playerLevelProgress.Data.LevelProgress == null)
        return generateErrObj("LevelProgress object undefined or null");

    var playerLevelProgressJSON = JSON.parse(readonlyData.Data.LevelProgress.Value);

    if (playerLevelProgressJSON == undefined || playerLevelProgressJSON == null)
        return generateErrObj("playerLevelProgressJSON undefined or null");

    //check if player is eligible for level up reward
    if (Number(playerLevelProgressJSON.LastLevelReward) >= Number(playerLevelProgressJSON.Level))
        return generateFailObj("Player not eligible for level up reward");

    //now, load the level up rewards from title data
    var levelsBalancingJSON = loadTitleDataJson("Balancing_PlayerLevels");

    if (levelsBalancingJSON == undefined || levelsBalancingJSON == null || levelsBalancingJSON.length == 0)
        return generateFailObj("Failed to load level rewards data");

    var levelRewardsObject = levelsBalancingJSON[Number(playerLevelProgressJSON.LastLevelReward)];

    //increment virtual currency
    addCurrency("SC", levelRewardsObject.RewardSC);
    addCurrency("HC", levelRewardsObject.RewardHC);
    addCurrency("TK", levelRewardsObject.RewardTK);

    //increment the LastLevelReward
    playerLevelProgressJSON.LastLevelReward = Number(playerLevelProgressJSON.LastLevelReward) + 1;

    //update the player's read-only data
    server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "LevelProgress": JSON.stringify(playerLevelProgressJSON) }
        }
    );

    return {
        Result: "OK",
        VirtualCurrency: server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency
    }
}
