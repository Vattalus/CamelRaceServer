function checkCarDataValidity(inventoryCarData, carCardsCatalog)
{
  if(inventoryCarData.CustomData == undefined)
  {
    try
    {
      var CarData = {
        "CarLvl" : "1",
        "EngineLvl" : "0",
        "ExhaustLvl" : "0",
        "GearboxLvl" : "0",
        "SuspensionLvl" : "0"
      };

      server.UpdateUserInventoryItemCustomData(
        {
          PlayFabId: currentPlayerId,
          ItemInstanceId: inventoryCarData.ItemInstanceId,
          Data: CarData
        }
      );
      CarData = {
        "TiresLvl" : "0",
        "TurboLvl" : "0",
        "PaintId" : "0",
        "DecalId" : "0",
        "RimsId" : "0"
      };
      server.UpdateUserInventoryItemCustomData(
        {
          PlayFabId: currentPlayerId,
          ItemInstanceId: inventoryCarData.ItemInstanceId,
          Data: CarData
        }
      );
      var pr = 0;
      for(var i =0; i < carCardsCatalog.Catalog.length; i++)
      {
        if(carCardsCatalog.Catalog[i].ItemId == inventoryCarData.ItemId)
        {
          var carCardInfo = JSON.parse(carCardsCatalog.Catalog[i].CustomData);
          pr = parseInt(carCardInfo.basePr);
          break;
        }
      }
      CarData = {
        "PlatesId" : "0",
        "WindshieldId" : "0",
        "Pr" : pr
      };
      server.UpdateUserInventoryItemCustomData(
        {
          PlayFabId: currentPlayerId,
          ItemInstanceId: inventoryCarData.ItemInstanceId,
          Data: CarData
        }
      );
    }
    catch(err)
    {
      return "PlayFabError";
    }
    var newData = {
      "CarLvl" : "1",
      "EngineLvl" : "0",
      "ExhaustLvl" : "0",
      "GearboxLvl" : "0",
      "SuspensionLvl" : "0",
      "TiresLvl" : "0",
      "TurboLvl" : "0",
      "PaintId" : "0",
      "DecalId" : "0",
      "RimsId" : "0" ,
      "PlatesId" : "0",
      "WindshieldId" : "0",
      "Pr" : pr
    };
    return newData;
  }
  return "OK";
}

function generateFailObjCustom(propName, mess)
{
  var retObj = {
    Result: "Failed",
    propName: mess
  };
  return retObj;
}

function generateFailObj(mess)
{
  var retObj = {
    Result: "Failed",
    Message: mess
  };
  return retObj;
}

function generateErrObj(mess)
{
  var retObj = {
    Result: "Error",
    Message: mess
  };
  return retObj;
}

function CheckMaintenanceAndVersion(args)
{    
    var debugMode = false;
    var clientVersion = "A.0.0.1";

    if(args != undefined) 
    {
      debugMode = args.debug;
      clientVersion = args.cVersion;
    }

    if(clientVersion == undefined) return "update"; // user has earlier build that doesn't send version to server with each call

    var maintenanceData = server.GetTitleData(
    {
      Key: ["Maintenance", "MinimumGameVersionActual_IOS", "MinimumGameVersionActual"]
    }
    );

    var versionToCompareTo = maintenanceData.Data["MinimumGameVersionActual"];
    var versionData = clientVersion.split(".");
    if(versionData.length != 4) return "maintenance"; // version data exists but it's corrupted
    if(versionData[0] == "ios") versionToCompareTo = maintenanceData.Data["MinimumGameVersionActual_IOS"];
    if(versionToCompareTo == undefined) return "maintenance"; // the title data isn't there so it's safe to assume the server isn't safe and it is in maintenance mode
    //needs update code
    var needsUpdate = false;

    var minGameVerSplit = versionToCompareTo.split('.');
    for (var i = 0; i < 3; i++)
    {
          var currVer = 0;
          if (versionData.length > i + 1)
                  currVer = Number(versionData[i + 1]);
          var minVer = 0;
          if (minGameVerSplit.length > i)
                  minVer = Number(minGameVerSplit[i]);

          //log.debug("iteration: " + i + " currVer: " + currVer + " vs minVer: " + minVer);
          if (currVer == minVer) continue;
          if (currVer < minVer)
          {
              needsUpdate = true;
              break;
          } 
          else
          {
            break;
          }   
    }
    // end needs update code
    if(needsUpdate == true) return "update";
    if(debugMode == true) return "OK"; // maintenance is bypassed by debug clients
    if(maintenanceData.Data["Maintenance"]) 
    {
      if(maintenanceData.Data["Maintenance"] == "false") return "OK";
      else return "maintenance";
    }
    else return "maintenance";
}

function generateMaintenanceOrUpdateObj(action)
{
  var retObj;
  if(action == "maintenance")
    retObj = {
      Result: "Maintenance",
      Message: "Servers are temporarily offline"
    };
  else
      retObj = {
      Result: "Update",
      Message: "Game needs to be updated"
    };
  return retObj;
}

function generateInventoryChange(mess, inventory)
{
  var r = {
    Result: "OK",
    Message: mess,
    InventoryChange:inventory
  };
  return r;
}

    /**
    * Function that handles publishing to "LiveFeed" Internal Title Data key
    * @param {actor} user playfabId
    * @param {action} action performed as described in "LiveFeedDictionary" Titledata key ("unlockedChest","promotedArena" etc)
    * @param {directObject} object of action as described in "LiveFeedDictionary" Titledata key
    */

function publishToLiveFeed(actor, action, directObject)
{
  //let's get live feed parameters
  var feedData = server.GetTitleData(
  {
    Keys : ["LiveFeedDictionary"]
  });
  if(feedData.Data["LiveFeedDictionary"] == undefined) return; 
  var feedDataParsed = JSON.parse(feedData.Data.LiveFeedDictionary);
  var chance = 0;
  var health = 0;
  var damage = 0;

  var aObjectChanceMultiplier = 1;
  var aObjectHealthMultiplier = 1;
  var actionDamageMultiplier = 1;

  var actionId = action;
  var objectId = directObject;

  var decayVal = 0;
  var maxFeedLength = 0;

  var isUniqueAction = false;

  //feedobject
  var feedObject = {};
  var d = new Date();
  feedObject["ts"] = d.getTime();
  //let's get feed metadata
  try
  {
    decayVal = Number(feedDataParsed.MetaData.HealthDecayPerMinute);
    maxFeedLength = Number(feedDataParsed.MetaData.MaxFeedHistory);
  }
  catch(err)
  {
    log.debug("invalid metadata");
    return;
  }
  //let's compute chance, health and damage the actor adds
  try
  {
    //base
    chance += Number(feedDataParsed.ActorData.Base.chance);
    health += Number(feedDataParsed.ActorData.Base.health);
    damage += Number(feedDataParsed.ActorData.Base.damage);

    //actor specific stats
    var ps=server.GetPlayerStatistics(
    {
      PlayFabId: actor,
      StatisticNames: ["IAPValue", "Trophies"] //this need to coincide with ActorData object's base properties other than Base from the LiveFeedDictionary data
    }).Statistics;
    var iapVal = Number(GetValueFromStatistics(ps, "IAPValue", 0));
    var trophies = Number(GetValueFromStatistics(ps, "Trophies", 0));

    chance += Number(feedDataParsed.ActorData["IAPValue"].chance) * iapVal;
    health += Number(feedDataParsed.ActorData["IAPValue"].health) * iapVal;
    damage += Number(feedDataParsed.ActorData["IAPValue"].damage) * iapVal;

    chance += Number(feedDataParsed.ActorData["Trophies"].chance) * trophies;
    health += Number(feedDataParsed.ActorData["Trophies"].health) * trophies;
    damage += Number(feedDataParsed.ActorData["Trophies"].damage) * trophies;
  }
  catch(err)
  {
    log.debug("error at liveFeed actor: " + err);
    return;
  }
  //let's compute chance, health and damage the action adds
  try
  {
    if(feedDataParsed.ActionsData[action] != undefined)
    {
      chance += Number(feedDataParsed.ActionsData[action].chance);
      health += Number(feedDataParsed.ActionsData[action].health);
      damage += Number(feedDataParsed.ActionsData[action].damage);
      actionId = feedDataParsed.ActionsData[action].id;

      if(feedDataParsed.ActionsData[action].isUnique == "true")
      	isUniqueAction = true;

      if(feedDataParsed.ActionsData[action].valMultiplier)
      {
          aObjectChanceMultiplier = Number(feedDataParsed.ActionsData[action].valMultiplier.chance);
          aObjectHealthMultiplier = Number(feedDataParsed.ActionsData[action].valMultiplier.health);
          actionDamageMultiplier = Number(feedDataParsed.ActionsData[action].valMultiplier.damage);
      }

    }
  }
  catch(err)
  {
    log.debug("error at liveFeed action: " + err);
    return;
  }

  //let's compute chance, health and damage the directObject adds
  try
  {
    if(isNaN(directObject) == true)
    {
      if(feedDataParsed.DirectObjectData[directObject] != undefined)
      {
        chance += Number(feedDataParsed.DirectObjectData[directObject].chance);
        health += Number(feedDataParsed.DirectObjectData[directObject].health);
        damage += Number(feedDataParsed.DirectObjectData[directObject].damage);
        objectId = feedDataParsed.DirectObjectData[directObject].id;
      }
    }
    else
    {
      chance += aObjectChanceMultiplier * Number(directObject);
      health += aObjectHealthMultiplier * Number(directObject);
      damage += actionDamageMultiplier * Number(directObject);
      objectId = directObject;
    }
  }
  catch(err)
  {
    log.debug("error at liveFeed object: " + err);
    return;
  }
  //chance to hit
  var chanceInt = Math.floor(chance);
  //if(Math.floor(Math.random() * 10000) >= chanceInt) return; // the feed didn't go through
  //we need the user displayname
  var playerInfo = server.GetPlayerCombinedInfo(
  {
    PlayFabId : actor,
    InfoRequestParameters: {"GetUserAccountInfo": true}
  });
  var username;
  try
  {
    username = playerInfo.InfoResultPayload.AccountInfo.TitleInfo.DisplayName
  }
  catch(err)
  {
    log.debug("error at liveFeed nameget: " + err);
    return;
  }
  log.debug("10");
  feedObject["health"] = health;
  feedObject["currentHealth"] = health;
  feedObject["UserId"] = actor;
  feedObject["UserName"] = username;
  feedObject["Action"] = actionId;
  feedObject["Object"] = objectId;

  //let's get the livefeed data
  var liveFeed = server.GetTitleInternalData(
  {
    Keys : ["LiveFeed"]
  });
  if(liveFeed.Data["LiveFeed"] == undefined) return; 
  var liveFeedArray = JSON.parse(liveFeed.Data.LiveFeed);

  //let's apply DecayOverTime to each livefeed item
  if(ApplyDamageOverTimeToFeed(liveFeedArray, decayVal) != "OK") return;
  var newFeed;
  try
  {
    if((Number(maxFeedLength) <= Number(liveFeedArray.length)) || (isUniqueAction == true)) 
    {// replace with one
      newFeed = new Array(liveFeedArray.length);
      var found = false;
        for(var i = 0; i < liveFeedArray.length; i++)
        {
	      if(
	         ((liveFeedArray[i].Action == actionId) && (isUniqueAction == true))
	         ||
	         ((liveFeedArray[i].currentHealth < damage) && (isUniqueAction == false))
	         )
	          {
	          	found = true;
	            liveFeedArray.splice(i,1);
	            break;
	          }
        }
        if(found == false)
        {
          liveFeedArray.splice(newFeed.length - 1,1);
        }
        
        for(var i = 0; i < liveFeedArray.length; i++)
        {
          if(liveFeedArray[i].currentHealth < health)
          {            
            liveFeedArray.splice(i,0,feedObject);
            newFeed = liveFeedArray;
            break;
          }
        }
      }
    else 
    {//add feed object
      newFeed = new Array(liveFeedArray.length + 1);
      newFeed[liveFeedArray.length] = feedObject;
        for(var i = 0; i < liveFeedArray.length; i++)
        {
          newFeed[i] = liveFeedArray[i];
          if(
          ((liveFeedArray[i].currentHealth < health) && (isUniqueAction == false)) || // sort by health
          ((liveFeedArray[i].Action == actionId) && (isUniqueAction == true)) //replace unique action
          ) 
          {
            newFeed[i] = feedObject;
            for(var j = i; j < liveFeedArray.length; j++)
            {
              newFeed[j + 1] = liveFeedArray[j];
            } 
            break;           
          }
        }
      }
  }
  catch(err)
  {
    log.debug("found error at feed replace/add: " + err);
    return;
  }
for(var i = 0; i < newFeed.length; i++)
{
  if(newFeed[i] == null) return; // hotfix
}
var dataToUpdate = JSON.stringify(newFeed);
var updateFeed = server.SetTitleInternalData(
    {
      Key: "LiveFeed", 
      Value: dataToUpdate
    }
    );
}

function ApplyDamageOverTimeToFeed(feedList, DoT)
{
  //let's check the feed array integrity first
  if(feedList.length == undefined) return "Error";
  var d = new Date();
  var currentTimeStamp = d.getTime();
  var dotDamage = 0;
  for(var i = 0; i < feedList.length; i++)
  {
    try
    {
      dotDamage = Math.abs((Number(feedList[i].ts) - Number(currentTimeStamp))) * Number(DoT);
      dotDamage = dotDamage / 60000; //it's damage per minute
      dotDamage = Math.floor(dotDamage);
      feedList[i].currentHealth = Math.max((Number(feedList[i].health) - Number(dotDamage)), 0);
    }
    catch(err)
    {
      feedList.splice(i,1);
    }
  }
  return "OK";
}

function updateUserProfileInfo(userId, carInfo)
{
  var profileInfoObj ={};
  //var userPorfileObject = server.GetUserReadOnlyData(
  //    {
  //      PlayFabId: userId,
  //      Keys: ["UserProfileInfo"]
  //    }
  //    );
  //if(userProfileInfo.Data.UserProfileInfo == undefined)
  profileInfoObj["CarData"] = carInfo;
  log.debug("carInfo is: " + carInfo);
  var dict = [];
    dict.push({
        Key:"UserProfileInfo",
        Value: JSON.stringify(profileInfoObj)
    });

    var playerData = server.UpdateUserReadOnlyData(
    {
      PlayFabId: userId,
      Data:dict,
      Permission: "Public"
    }
  );
    log.debug("playerData is: " + playerData);
}

function updateCurrencySpentStatistic(currType, amount)
{
  var suArray = [];
  var statName;
  var currValue = 0;
  var changeValue = Number(amount);
  if(isNaN(changeValue) || changeValue <= 0) return;
  if(currType == "SC") statName = "MoneySpent";
  if(currType == "HC") statName = "GoldSpent";
  if(statName == undefined) return;
    var ps=server.GetPlayerStatistics(
    {
       PlayFabId: currentPlayerId,
       StatisticNames: [statName]
    });
    if(ps.Statistics.length > 0)
    {
        currValue = Number(ps.Statistics[0].Value);
    }  
    currValue += changeValue;
    var su = {StatisticName: statName, Version : "0", Value: currValue};
    suArray.push(su);
    var updateRequest = server.UpdatePlayerStatistics(
      {
         PlayFabId: currentPlayerId,
         Statistics: suArray
      }
      );
}

function checkBalance(currType, cost, userSCBalance, userHCBalance)
{
  if(currType == "SC")
  {
    if(userSCBalance < cost)
    return generateFailObj("NotEnoughSC");
  }
  else
  {
    if(userHCBalance < cost)
    return generateFailObj("NotEnoughHC");
  }
  return "OK";
}

function calculateLeague(currentTrophies)
{
  var league = 1;
  var td = server.GetTitleData(
    {
      Keys : ["LeagueSubdivisions", "SubdivisionTrophyRanges"]
    });
    if(td.Data["LeagueSubdivisions"] == undefined) return league;
    if(td.Data["SubdivisionTrophyRanges"] == undefined) return league;
    var leaguesSubdivisions = JSON.parse(td.Data.LeagueSubdivisions);
    var leaguesSubdivisionsParsed = leaguesSubdivisions.leagues;
    var sdvtr = JSON.parse(td.Data.SubdivisionTrophyRanges);
    var sdvtrParsed = sdvtr.subdivisions;

    for(var i = 0; i < leaguesSubdivisionsParsed.length; i++)
    {
      if(Number(currentTrophies) > Number(sdvtrParsed[leaguesSubdivisionsParsed[i]]))
      continue;
      return i;
    }
    return leaguesSubdivisionsParsed.length - 1;
  }

  function recalculateCarPr(CarData, carId, _carCardsCatalog, _partsCardCatalog)
  {
    var pr = 0;
    var carCardsCatalog;
    if(_carCardsCatalog === undefined)
    {
      carCardsCatalog = server.GetCatalogItems(
        {
          CatalogVersion : "CarCards"
        }
      );
    }
    else
    {
      carCardsCatalog = _carCardsCatalog;
    }
    for(var i = 0; i < carCardsCatalog.Catalog.length; i++)
    {
      if(carCardsCatalog.Catalog[i].ItemId == carId)
      {
        var carCardInfo = JSON.parse(carCardsCatalog.Catalog[i].CustomData);
        pr = parseInt(carCardInfo.basePr) + getObjectValueFromLevel(carCardInfo, "prPerLvl", CarData.CarLvl);
        break;
      }
    }

    //calcualte pr based on each part level
    var partCardsCatalog;
    if(_partsCardCatalog === undefined)
    {
      partCardsCatalog = server.GetCatalogItems(
        {
          CatalogVersion : "PartCards"
        }
      );
    }
    else
    {
      partCardsCatalog = _partsCardCatalog;
    }

    var tempDict =
    {
      Exhaust: CarData.ExhaustLvl,
      Engine: CarData.EngineLvl,
      Gearbox: CarData.GearboxLvl,
      Suspension: CarData.SuspensionLvl,
      Tires: CarData.TiresLvl,
      Turbo: CarData.TurboLvl
    };
    var partCardInfo;
    for(i = 0; i < partCardsCatalog.Catalog.length; i++) //refactored
    {
      partCardInfo = JSON.parse(partCardsCatalog.Catalog[i].CustomData);
      pr += getObjectValueFromLevel(partCardInfo, "prPerLvl", Number(tempDict[partCardsCatalog.Catalog[i].ItemId]));
    }
    return pr;
  }

  function GenerateBlackMarket(currentPlayerId)
  {
    //getting user league
    var league = 1;
    var ps=server.GetPlayerStatistics(
      {
        PlayFabId: currentPlayerId,
        StatisticNames: ["League"]
      });
    
      if(ps.Statistics.length != 0)
      {
        league = ps.Statistics[0].Value.toString();
      }
      if(Number(league) <= 0) league = 1; // clamped
      //getting parts
      var partsCatalog = server.GetCatalogItems(
        {
          CatalogVersion : "PartCards"
        }
      );
      //getting bias numbers for rare, common and epic chance
      var tK = ["BlackMarketResetMinutes", "BlackMarketRarityBias"];
      var tData = server.GetTitleData(
        {
          PlayFabId : currentPlayerId,
          Keys : tK
        }
      );
      var bias = tData.Data.BlackMarketRarityBias;
      var biasParsed = JSON.parse(bias);
      //let's create a common parts list, a rare parts list and an epic parts list
      var partCardParsed;
      var commonParts = [];
      var rareParts = [];
      var epicParts = [];
      for(var i = 0; i < partsCatalog.Catalog.length; i++)
      {
        partCardParsed = JSON.parse(partsCatalog.Catalog[i].CustomData)
        if(partCardParsed == undefined) return generateErrObj("Part card " + partsCatalog.Catalog[i].ItemId + " has no custom data.");
        if(partCardParsed.rarity == 0) commonParts.push(partsCatalog.Catalog[i].ItemId + "_" + partCardParsed.BMCurrType + "_" + partCardParsed.BMbasePrice + "_" + 0 + "_" + partCardParsed.BMpriceIncrPerBuy);
        if(partCardParsed.rarity == 1) rareParts.push(partsCatalog.Catalog[i].ItemId + "_" + partCardParsed.BMCurrType + "_" + partCardParsed.BMbasePrice + "_" + 0 + "_" + partCardParsed.BMpriceIncrPerBuy);
        if(partCardParsed.rarity == 2) epicParts.push(partsCatalog.Catalog[i].ItemId + "_" + partCardParsed.BMCurrType + "_" + partCardParsed.BMbasePrice + "_" + 0 + "_" + partCardParsed.BMpriceIncrPerBuy);
      }

      var dataToUpdate = {};
      var d = new Date();
      dataToUpdate["BMTime"] = d.getTime();
      //get first part. It is always common
      var part0Index = Math.floor(Math.random() * commonParts.length);
      dataToUpdate["BMItem0"] = commonParts[part0Index];
      if(commonParts.length >= 2) commonParts.splice(part0Index, 1);
      //generate second car card

      var searchArray = commonParts;
      if(Math.floor(Math.random() * 100) < Number(biasParsed.parts[2])) //biasParsed.parts[2]% chance to be the epic card
        searchArray = epicParts;
      else 
      {
        var newPerc = Number(biasParsed.parts[0]) + Number(biasParsed.parts[1]);
        if (Math.floor(Math.random() * newPerc) >= Number(biasParsed.parts[0])) // this means that it's going to be rare
        {
          searchArray = rareParts;
        }
      }
      var part1Index = Math.floor(Math.random() * searchArray.length);
      dataToUpdate["BMItem1"] = searchArray[part1Index];
      //getting car cards
      var carsCatalog = server.GetCatalogItems(
        {
          CatalogVersion : "CarCards"
        }
      );
      var carCardParsed;
      var commonIndexes = [];
      var rareIndexes = [];
      var epicIndexes = [];
      for(var i = 0; i < carsCatalog.Catalog.length; i++)
      {
        carCardParsed = JSON.parse(carsCatalog.Catalog[i].CustomData)
        if(carCardParsed == undefined) return generateErrObj("Car card " + carsCatalog.Catalog[i].ItemId + " has no custom data.");
        if(Number(carCardParsed.unlockedAtRank) >= (Number(league) + 1)) continue;
        if(carCardParsed.rarity == "0") commonIndexes.push(carsCatalog.Catalog[i].ItemId + "_" + carCardParsed.BMCurrType + "_" + carCardParsed.BMbasePrice + "_" + 0 + "_" + carCardParsed.BMpriceIncrPerBuy);
        if(carCardParsed.rarity == "1") rareIndexes.push(carsCatalog.Catalog[i].ItemId + "_" + carCardParsed.BMCurrType + "_" + carCardParsed.BMbasePrice + "_" + 0 + "_" + carCardParsed.BMpriceIncrPerBuy);
        if(carCardParsed.rarity == "2") epicIndexes.push(carsCatalog.Catalog[i].ItemId + "_" + carCardParsed.BMCurrType + "_" + carCardParsed.BMbasePrice + "_" + 0 + "_" + carCardParsed.BMpriceIncrPerBuy);
      }
      var carIdx = Math.floor(Math.random() * commonIndexes.length);
      dataToUpdate["BMItem2"] = commonIndexes[carIdx];
      if(commonIndexes.length >= 2) commonIndexes.splice(carIdx, 1);

      if(rareIndexes.length <= 0)
      {
        if(epicIndexes.length <= 0)
          {
            rareIndexes = commonIndexes;
            epicIndexes = commonIndexes;
          }
          else
          {
            rareIndexes = epicIndexes;
          }
      }
      if(epicIndexes.length <= 0)
      {
        epicIndexes = rareIndexes;
      }

      var carSearchArray = commonIndexes;
      if(Math.floor(Math.random() * 100) < Number(biasParsed.cars[2])) //biasParsed.cars[2]% chance to be the epic card
        carSearchArray = epicIndexes;
      else 
      {
        var newPerc = Number(biasParsed.cars[0]) + Number(biasParsed.cars[1]);
        if (Math.floor(Math.random() * newPerc) >= Number(biasParsed.cars[0])) // this means that it's going to be rare
        {
          carSearchArray = rareIndexes;
        }
      }

      carIdx = Math.floor(Math.random() * carSearchArray.length);
      dataToUpdate["BMItem3"] = carSearchArray[carIdx];

      server.UpdateUserInternalData(
        {
          PlayFabId : currentPlayerId,
          Data : dataToUpdate
        }
      );
      dataToUpdate["BMTime"] = parseInt(tData.Data.BlackMarketResetMinutes) * 60;
      return dataToUpdate;
    }

    function GetCurrentBlackMarket(currentPlayerId, getInternalDataResult)
    {
      var bmObj = {};
      var d = new Date();

      var tK = [];
      tK.push("BlackMarketResetMinutes");
      var tData = server.GetTitleData(
        {
          PlayFabId : currentPlayerId,
          Keys : tK
        }
      );

      bmObj["BMTime"] = parseInt(tData.Data.BlackMarketResetMinutes) * 60 - Math.floor((d.getTime() - getInternalDataResult.Data.BMTime.Value) / 1000);
      for(var i = 0; i < 4; i++)
      {
        bmObj["BMItem" + i] = getInternalDataResult.Data["BMItem" + i].Value;
      }
      return bmObj;
    }



    /**
    * Returns the statistics value from the provided statistics array
    * @param {array} statisticsArray containing statistics objects
    * @param {string} statisticsName id of the searched statistic
    * @param {value} statisticsName (optional) default value returned if statistic is not found
    */
    function GetValueFromStatistics(statisticsArray, statisticsName, defaultValue)
    {
      var stat;
      //find statistic with given name
      for (var i = 0; i < statisticsArray.length; i++)
      if(statisticsArray[i].StatisticName === statisticsName)
      stat = statisticsArray[i];
      if(stat === undefined)
      return defaultValue !== undefined ? defaultValue : 0;
      else
      return Number(stat.Value);
    }

    /**
    * Returns the statistics version from the provided statistics array
    * @param {array} statisticsArray containing statistics objects
    * @param {string} statisticsName id of the searched statistic
    * @param {value} statisticsName (optional) default value returned if statistic is not found
    */
    function GetVersionFromStatistics(statisticsArray, statisticsName, defaultValue)
    {
      var stat;
      //find statistic with given name
      for (var i = 0; i < statisticsArray.length; i++)
      if(statisticsArray[i].StatisticName === statisticsName)
      stat = statisticsArray[i];
      //log.debug("Stat with name statisticsName: " + statisticsName + " is " + stat);
      if(stat === undefined)
      return defaultValue !== undefined ? defaultValue : 0;
      else
      return Number(stat.Version);
    }
    /**
    * Returns catalog item or undifined
    * @param {string} catalogId the catalog id of the requested item
    * @param {string} itemId of the recuested item
    */
    function getCatalogItem(catalogId, itemId)
    {
      var items = server.GetCatalogItems({CatalogVersion : catalogId});
      for (var i = 0; i < items.Catalog.length; i++) {
        if(items.Catalog[i].ItemId === itemId)
        return items.Catalog[i];
      }

      return undefined;
    }


    /**
    * Returns the item value from the object with id itemId at index level
    * The given object must have a 'length' property used to clamp level inbounds
    * @param  {object} holdingObject, object in which itemId is searched
    * @param  {string} itemId, property id of the object that contains the desired value
    * @param  {int} level, index of the desired value
    * @param  {value} defaultValue, 0 if none provided
    * @return {value}, defaultValue or the value at index level in object itemId
    */
    function getObjectValueFromLevel(holdingObject, itemId, level, defaultValue) {
      if(!defaultValue) defaultValue = 0;
      if(!holdingObject[itemId] || !holdingObject[itemId].length) return defaultValue;

      // clamp ln to lenght is it can't get out of bounds
      var ln = Number(holdingObject[itemId].length);
      if(level >= ln) level = ln - 1;
      return Number(holdingObject[itemId][level]) || defaultValue;
    }


    /**
    * Gives user part $partName in the range amount of amount0-amount1
    * @param  {partName} part to give
    * @param  {amount0} min amount
    * @param  {amount1} max amount
    * @param  {inventoryObject} user's inventory object
    * @return {value}, "OK" or "Error"
    */
    function GiveUserPart(partName, amount0, amount1, inventoryObject)
    {
      GiveUserCard(partName, "PartsCards", amount0, amount1, inventoryObject);
    }

    function GiveUserCarCard(cardName, amount0, amount1, inventoryObject)
    {
      GiveUserCard(cardName, "CarCards", amount0, amount1, inventoryObject);
    }

    function GiveUserCard(cardName, catalogName, amount0, amount1, inventoryObject)
    {
      var cardsAmount;
      if(Number(amount0) < Number(amount1))
      {
        cardsAmount = Number(amount0) + Math.floor(Math.random() * (Number(amount1) - Number(amount0)));
      }
      else
      {
        cardsAmount = Number(amount0);
      }
      log.debug("cardsAmount: " + cardsAmount);
      var cardInstance;
      var newAmount;
      for(var i = 0; i < inventoryObject.Inventory.length; i++)
      {
        if((inventoryObject.Inventory[i].ItemId == cardName) && (inventoryObject.Inventory[i].CatalogVersion == catalogName)) // user has part so only change the Amount Custom Data field
        {
          cardInstance = inventoryObject.Inventory[i].ItemInstanceId;
          if(inventoryObject.Inventory[i].CustomData == undefined) 
          {
            newAmount = cardsAmount;
          }
          else 
          {
            if(inventoryObject.Inventory[i].CustomData.Amount == undefined)
              newAmount = cardsAmount;
            else
              if(isNaN(Number(inventoryObject.Inventory[i].CustomData.Amount)))
                newAmount = cardsAmount;
              else
                newAmount = Number(inventoryObject.Inventory[i].CustomData.Amount) + Number(newAmount); // this is the nothing went wrong branch
          }

          break; // for break
        }
      } // end for

      if(cardInstance == undefined)
      {
        newAmount = cardsAmount;
        var itemsToGive = [];
        itemsToGive.push(cardName);
        var grantRequest = server.GrantItemsToUser(
          {
            CatalogVersion : catalogName,
            PlayFabId: inventoryObject.PlayFabId,
            ItemIds : itemsToGive
          }
          );
        cardInstance = grantRequest.ItemGrantResults[0].ItemInstanceId;
        if(cardInstance === undefined)
          return generateErrObj("grantRequest denied");
      }

      var itemData = {"Amount" : newAmount};
      log.debug("new amount is: " + newAmount);
      server.UpdateUserInventoryItemCustomData(
        {
          PlayFabId: inventoryObject.PlayFabId,
          ItemInstanceId: cardInstance,
          Data: itemData
        }
        );

      var dataChanged =         
        {
          ItemId : cardName,
          CatalogVersion: catalogName,
          CustomData: itemData
        }

      return dataChanged;
    }
//Chest Generation functions
function GetRandomCard(cardList, arenaLevel)
{  
  if (cardList == undefined) return "ERROR";
  if (cardList.length == undefined) return "ERROR";
  if (cardList.length <= 0) return "ERROR";
  var randIndex = Math.floor(Math.random() * cardList.length);
  return cardList[randIndex];
}

function AddCardToListOfStacks(catalog, rarityCardsListFinal, card, canCreateNewStack)
{
  if(rarityCardsListFinal == undefined)
  {
    rarityCardsListFinal = 
    [
      {
        ItemId : card,
        CatalogVersion: catalog,
        CustomData: {"Amount" : 1}
      }
    ];
    return rarityCardsListFinal;
  }

  for(var i = 0; i < rarityCardsListFinal.length; i++)
  {
    if(rarityCardsListFinal[i].ItemId == card)
    {
      rarityCardsListFinal[i].CustomData.Amount = Number(rarityCardsListFinal[i].CustomData.Amount) + 1;
      return rarityCardsListFinal;
    }
  }

  if(canCreateNewStack == true)
  {
    var obj = {
        ItemId : card,
        CatalogVersion: catalog,
        CustomData: {"Amount" : 1}
    }
    rarityCardsListFinal.push(obj);
    return rarityCardsListFinal;
  }
  else
  {
    rarityCardsListFinal[Math.floor(Math.random() * rarityCardsListFinal.length)].CustomData.Amount = Number(rarityCardsListFinal[Math.floor(Math.random() * rarityCardsListFinal.length)].CustomData.Amount) + 1;
    return rarityCardsListFinal;
  }
}

function WeightedRandom(array, totalweight)
{
  try
  {
    var totalWeight = 0;
    for(var i = 0; i < array.length; i++)
    {
      totalWeight += Number(array[i]);
    }
    var rand = Math.floor(Math.random() * Number(totalWeight));
    for(var i = 0; i < array.length; i++)
    {
      if(rand <= Number(array[i])) // we found it
      {
        return i;
      }
      rand -= Number(array[i]);
    }
    return 0;
  }
  catch(err)
  {
    log.debug(err);
    return 0;
  }
}