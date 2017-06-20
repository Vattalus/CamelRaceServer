//call this only once to set title data for current season. Call this after logLegendRank and endSeasonUser tasks were called
handlers.endSeasonTitle = function(args, context)
{
	//BACKUP
	//{"endSezonTimestamp":1488382264,"endSezonRewards":["DiamondChest","GoldChest","BigSilverChest"],"scConversionRate":5,"hcConversionRate":1,"defaultChest":"SilverChest"}
	//set time stamp for next month day 1 time 00:00. Sync this with the autmoated task in playfab of resetting the season
	//TEMP 5 minutes reset ladder
	log.debug("context: " + JSON.stringify(context));
	try
	{
		//let's get the end game variables
		var endGameData = server.GetTitleData(
		{
			Keys : ["EndSezonObject"]
		});
		var endGameDataParsed;
		log.debug("1: " + endGameData);
		endGameDataParsed = JSON.parse(endGameData.Data.EndSezonObject);
		log.debug("2: " + endGameDataParsed);
		endGameDataParsed.endSezonTimestamp = Math.floor((new Date().getTime() /1000)) + 60 * 60; // seconds - 5 minutes differentati
		log.debug("3: " + endGameDataParsed);
		server.SetTitleData(
		{
			Key: "EndSezonObject",
			Value: JSON.stringify(endGameDataParsed)
		});
		log.debug("4: " + endGameDataParsed);
	}
	catch(err)
	{
		log.debug("err: " + err);
	}
}
// call this for each user before calling endSeasonUser
handlers.logLegendRank = function(args, context)
{
	try
	{
		//let's get the end game variables
		var endGameData = server.GetTitleData(
		{
			Keys : ["EndSezonObject"]
		});
		var endGameDataParsed;
		var endGameRewardArray;
		try
		{
			endGameDataParsed = JSON.parse(endGameData.Data.EndSezonObject);
			//log.debug("endGameDataParsed: " + endGameDataParsed);
			endGameRewardArray = endGameDataParsed.endSezonRewards;
		}
		catch(err)
		{
			log.debug('err: ' + err);
			return;
		}

		var pos = server.GetLeaderboardAroundUser(
		{
			StatisticName : "TrophyCount",
			PlayFabId : currentPlayerId,
			MaxResultsCount : 1
		}).Leaderboard[0].Position;

		//let's give appropriate chest
		if(pos < endGameRewardArray.length)
			server.UpdateUserReadOnlyData(
			{
				PlayFabId : currentPlayerId,
				Data : {"EndSeasonChest" : endGameRewardArray[Number(pos)]}
			});

		pos = Number(pos) + 1;

		server.UpdateUserReadOnlyData(
		{
			PlayFabId : currentPlayerId,
			Data : {"RankLastSeason" : pos}
		});
	}
	catch(err)
	{
		log.debug("err: " + err);
		return;
	}
}
//W CALL THIS FOR EACH USER
handlers.endSeasonUser = function(args, context)
{
	var endSeasonData = 
	{
		"didClaim" : true,
		"scReceived" : 0,
		"hcReceived" : 0,
		"previousTrophies" : 0,
		"currentTrophies" : 0
	};
	//let's get the end game variables
	var endGameData = server.GetTitleData(
	{
		Keys : ["EndSezonObject", "SubdivisionTrophyRanges"]
	});
	try
	{
		var endGameDataParsed = JSON.parse(endGameData.Data.EndSezonObject);
		var trophyData = server.GetPlayerStatistics(
		{
			PlayFabId : currentPlayerId,
			StatisticNames : ["TrophyCount"]
		}).Statistics;
		var currentTrophies = Number(trophyData[0].Value);
		var arrTemp = JSON.parse(endGameData.Data.SubdivisionTrophyRanges).subdivisions;
		//var resetTrophiesValue = arrTemp[arrTemp.length - 1]; // code this properly later
		var resetTrophiesValue = 3001;
		var scToGive = Math.ceil(Number(endGameDataParsed.scConversionRate) * (currentTrophies - resetTrophiesValue));
		var hcToGive = Math.ceil(Number(endGameDataParsed.hcConversionRate) * (currentTrophies - resetTrophiesValue));
		endSeasonData = 
		{
			"didClaim" : false,
			"scReceived" : scToGive,
			"hcReceived" : hcToGive,
			"previousTrophies" : currentTrophies,
			"currentTrophies" : resetTrophiesValue
		};

		server.UpdatePlayerStatistics(
		{
			PlayFabId : currentPlayerId,
			Statistics : [{StatisticName : "TrophyCount", Value: resetTrophiesValue}]
		});

		if(scToGive > 0)
			server.AddUserVirtualCurrency(
			{
				PlayFabId : currentPlayerId,
				VirtualCurrency : "SC",
				Amount : scToGive
			});
		if(hcToGive > 0)
			server.AddUserVirtualCurrency(
			{
				PlayFabId : currentPlayerId,
				VirtualCurrency : "HC",
				Amount : hcToGive
			});
	}
	catch(err)
	{
		log.debug('err: ' + err);
		//return;
	}

	server.UpdateUserReadOnlyData(
	{
		PlayFabId : currentPlayerId,
		Data : {"EndSeasonReward" : JSON.stringify(endSeasonData)}
	});
}

//sets claim status from EndSeasonReward to true
//if there exists an end season chest @ EndSeasonChest open it and send the data to the client

handlers.claimEndSeasonReward = function(args, context)
{
	//let's see if the user was legend by checking for the existence of EndSeasonReward entry
	try
	{
		var userData = server.GetUserReadOnlyData(
		{
			PlayFabId : currentPlayerId,
			Keys : ["EndSeasonReward", "EndSeasonChest"]
		});
		if(userData.Data.EndSeasonReward == undefined) return generateFailObj("Nothing to claim");
		var updateObj = JSON.parse(userData.Data.EndSeasonReward.Value);
		updateObj.didClaim = true;
		server.UpdateUserReadOnlyData(
		{
			PlayFabId : currentPlayerId,
			Data : {"EndSeasonReward" : JSON.stringify(updateObj)}
		})

		if(userData.Data.EndSeasonChest == undefined) return {Result : "OK", Message : "noChest"};
		var chestId = userData.Data.EndSeasonChest.Value;
		if(chestId == null) return {Result : "OK", Message : "noChest"};

		//looks like we have a chest. Let's get its data from the catalog
		var catalogData = server.GetCatalogItems({CatalogVersion : "Chests"});

		var chestInfo;
		for(var i = 0; i < catalogData.Catalog.length; i++)
		{
			if(catalogData.Catalog[i].ItemId == chestId)
			{
				chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
				break;
			}
		}
		if(chestInfo == undefined) return generateErrObj("Could not find chest with id: " + chestId + " in the Chests catalog, or this chest's custom data is undefined");		

		log.debug("generatung: " + chestId);
		var chestBounty = GenerateChestBounty(currentPlayerId, chestId, 7, chestInfo);

		var outInventory = server.GetUserInventory({PlayFabId: currentPlayerId});

		server.UpdateUserReadOnlyData(
		{
			PlayFabId : currentPlayerId,
			Data : {"EndSeasonChest" : null}
		});

		var returnObject = {
				Result : "OK",
				InventoryChange: outInventory,
				ChestBounty : chestBounty 
			}
		return returnObject;
	}
	catch(err)
	{
		log.debug("err: " + err);
		return generateErrObj("something went wrong: " + err);
	}
}
