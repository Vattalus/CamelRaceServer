handlers.buyPremiumChest = function(args, context)
{
	var mC = CheckMaintenanceAndVersion(args);
  	if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
	//let's figure out the user's league
	var tc=server.GetPlayerStatistics(
	  {
	     PlayFabId: currentPlayerId,
	     StatisticNames: ["TrophyCount"]
	  });
	var trophyCount = 0;
	if(tc.Statistics.length != 0)
	  {
	    trophyCount = tc.Statistics[0].Value;
	  }
	trophyCount = Number(trophyCount);
	var cLeague = Number(calculateLeague(trophyCount));

	//let's get the catalog data for chests
	var catalogData = server.GetCatalogItems({CatalogVersion : "Chests"});

	//let's get the chestInfo for freeChest
	var chestInfo;
	var chestPrice;
	for(var i = 0; i < catalogData.Catalog.length; i++)
	{
		if(catalogData.Catalog[i].ItemId == args.chestId)
		{
			chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
			chestPrice = catalogData.Catalog[i].VirtualCurrencyPrices.HC; //these chests will only cost HC hopefully
			if(chestPrice == undefined) return generateErrObj("Chest has INVALID PRICE TAG");
			break;
		}
	}
	if(chestInfo == undefined) return generateErrObj("Could not find chest with id: " + args.chestId + " in the Chests catalog, or this chest's custom data is undefined");

	//let's check if the user can afford the chest
	//let's see what the chest costs

	//we now have to querry the user's inventory to see if he has enough currency to purchase the chest
	var userInventoryObject = server.GetUserInventory(
		 {
			  PlayFabId: currentPlayerId
		 });

	if(Number(chestPrice) > Number(userInventoryObject.VirtualCurrency.HC)) return generateErrObj("Not enough HC.");

	//let's subtract chestPrice amount of gold from the user
	var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
	{
		 PlayFabId: currentPlayerId,
		 VirtualCurrency : "HC",
		 Amount: Number(chestPrice)
	});
	//update the CurrencySpent stat for this user
	updateCurrencySpentStatistic("HC", chestPrice);

	//let's roll for chest bounty
	var chestBounty = GenerateChestBounty(currentPlayerId, args.chestId, cLeague, chestInfo);

		//let's get the new user inventory
	var outInventory = server.GetUserInventory({PlayFabId: currentPlayerId});
	var totalXp = UpdateExperience("Chests", args.chestId, "xpGain", 0, true);
	outInventory.Experience = totalXp;
	
	var returnObject = 
	{
		Result : "OK",
		ChestBounty : chestBounty,
		InventoryChange : outInventory
	}	

	//let's publish to the feed
    publishToLiveFeed(currentPlayerId, "unlockedChest", args.chestId);

	return returnObject;
}
