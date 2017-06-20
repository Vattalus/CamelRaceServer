function checkCarDataValidity(inventoryCarData, carCardsCatalog) {
    if (inventoryCarData.CustomData == undefined) {
        try {
            var CarData = {
                "CarLvl": "1",
                "EngineLvl": "0",
                "ExhaustLvl": "0",
                "GearboxLvl": "0",
                "SuspensionLvl": "0"
            };

            server.UpdateUserInventoryItemCustomData(
              {
                  PlayFabId: currentPlayerId,
                  ItemInstanceId: inventoryCarData.ItemInstanceId,
                  Data: CarData
              }
            );
            CarData = {
                "TiresLvl": "0",
                "TurboLvl": "0",
                "PaintId": "0",
                "DecalId": "0",
                "RimsId": "0"
            };
            server.UpdateUserInventoryItemCustomData(
              {
                  PlayFabId: currentPlayerId,
                  ItemInstanceId: inventoryCarData.ItemInstanceId,
                  Data: CarData
              }
            );
            var pr = 0;
            for (var i = 0; i < carCardsCatalog.Catalog.length; i++) {
                if (carCardsCatalog.Catalog[i].ItemId == inventoryCarData.ItemId) {
                    var carCardInfo = JSON.parse(carCardsCatalog.Catalog[i].CustomData);
                    pr = parseInt(carCardInfo.basePr);
                    break;
                }
            }
            CarData = {
                "PlatesId": "0",
                "WindshieldId": "0",
                "Pr": pr
            };
            server.UpdateUserInventoryItemCustomData(
              {
                  PlayFabId: currentPlayerId,
                  ItemInstanceId: inventoryCarData.ItemInstanceId,
                  Data: CarData
              }
            );
        }
        catch (err) {
            return "PlayFabError";
        }
        var newData = {
            "CarLvl": "1",
            "EngineLvl": "0",
            "ExhaustLvl": "0",
            "GearboxLvl": "0",
            "SuspensionLvl": "0",
            "TiresLvl": "0",
            "TurboLvl": "0",
            "PaintId": "0",
            "DecalId": "0",
            "RimsId": "0",
            "PlatesId": "0",
            "WindshieldId": "0",
            "Pr": pr
        };
        return newData;
    }
    return "OK";
}

function generateFailObjCustom(propName, mess) {
    var retObj = {
        Result: "Failed",
        propName: mess
    };
    return retObj;
}

function generateFailObj(mess) {
    var retObj = {
        Result: "Failed",
        Message: mess
    };
    return retObj;
}

function generateErrObj(mess) {
    var retObj = {
        Result: "Error",
        Message: mess
    };
    return retObj;
}

function CheckMaintenanceAndVersion(args) {
    var debugMode = false;
    var clientVersion = "A.0.0.1";

    if (args != undefined) {
        debugMode = args.debug;
        clientVersion = args.cVersion;
    }

    if (clientVersion == undefined) return "update"; // user has earlier build that doesn't send version to server with each call

    var maintenanceData = server.GetTitleData(
    {
        Key: ["Maintenance", "MinimumGameVersionActual_IOS", "MinimumGameVersionActual"]
    }
    );

    var versionToCompareTo = maintenanceData.Data["MinimumGameVersionActual"];
    var versionData = clientVersion.split(".");
    if (versionData.length != 4) return "maintenance"; // version data exists but it's corrupted
    if (versionData[0] == "ios") versionToCompareTo = maintenanceData.Data["MinimumGameVersionActual_IOS"];
    if (versionToCompareTo == undefined) return "maintenance"; // the title data isn't there so it's safe to assume the server isn't safe and it is in maintenance mode
    //needs update code
    var needsUpdate = false;

    var minGameVerSplit = versionToCompareTo.split('.');
    for (var i = 0; i < 3; i++) {
        var currVer = 0;
        if (versionData.length > i + 1)
            currVer = Number(versionData[i + 1]);
        var minVer = 0;
        if (minGameVerSplit.length > i)
            minVer = Number(minGameVerSplit[i]);

        //log.debug("iteration: " + i + " currVer: " + currVer + " vs minVer: " + minVer);
        if (currVer == minVer) continue;
        if (currVer < minVer) {
            needsUpdate = true;
            break;
        }
        else {
            break;
        }
    }
    // end needs update code
    if (needsUpdate == true) return "update";
    if (debugMode == true) return "OK"; // maintenance is bypassed by debug clients
    if (maintenanceData.Data["Maintenance"]) {
        if (maintenanceData.Data["Maintenance"] == "false") return "OK";
        else return "maintenance";
    }
    else return "maintenance";
}

function generateMaintenanceOrUpdateObj(action) {
    var retObj;
    if (action == "maintenance")
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

function generateInventoryChange(mess, inventory) {
    var r = {
        Result: "OK",
        Message: mess,
        InventoryChange: inventory
    };
    return r;
}

/**
* Function that handles publishing to "LiveFeed" Internal Title Data key
* @param {actor} user playfabId
* @param {action} action performed as described in "LiveFeedDictionary" Titledata key ("unlockedChest","promotedArena" etc)
* @param {directObject} object of action as described in "LiveFeedDictionary" Titledata key
*/

function publishToLiveFeed(actor, action, directObject) {
    //let's get live feed parameters
    var feedData = server.GetTitleData(
    {
        Keys: ["LiveFeedDictionary"]
    });
    if (feedData.Data["LiveFeedDictionary"] == undefined) return;
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
    try {
        decayVal = Number(feedDataParsed.MetaData.HealthDecayPerMinute);
        maxFeedLength = Number(feedDataParsed.MetaData.MaxFeedHistory);
    }
    catch (err) {
        log.debug("invalid metadata");
        return;
    }
    //let's compute chance, health and damage the actor adds
    try {
        //base
        chance += Number(feedDataParsed.ActorData.Base.chance);
        health += Number(feedDataParsed.ActorData.Base.health);
        damage += Number(feedDataParsed.ActorData.Base.damage);

        //actor specific stats
        var ps = server.GetPlayerStatistics(
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
    catch (err) {
        log.debug("error at liveFeed actor: " + err);
        return;
    }
    //let's compute chance, health and damage the action adds
    try {
        if (feedDataParsed.ActionsData[action] != undefined) {
            chance += Number(feedDataParsed.ActionsData[action].chance);
            health += Number(feedDataParsed.ActionsData[action].health);
            damage += Number(feedDataParsed.ActionsData[action].damage);
            actionId = feedDataParsed.ActionsData[action].id;

            if (feedDataParsed.ActionsData[action].isUnique == "true")
                isUniqueAction = true;

            if (feedDataParsed.ActionsData[action].valMultiplier) {
                aObjectChanceMultiplier = Number(feedDataParsed.ActionsData[action].valMultiplier.chance);
                aObjectHealthMultiplier = Number(feedDataParsed.ActionsData[action].valMultiplier.health);
                actionDamageMultiplier = Number(feedDataParsed.ActionsData[action].valMultiplier.damage);
            }

        }
    }
    catch (err) {
        log.debug("error at liveFeed action: " + err);
        return;
    }

    //let's compute chance, health and damage the directObject adds
    try {
        if (isNaN(directObject) == true) {
            if (feedDataParsed.DirectObjectData[directObject] != undefined) {
                chance += Number(feedDataParsed.DirectObjectData[directObject].chance);
                health += Number(feedDataParsed.DirectObjectData[directObject].health);
                damage += Number(feedDataParsed.DirectObjectData[directObject].damage);
                objectId = feedDataParsed.DirectObjectData[directObject].id;
            }
        }
        else {
            chance += aObjectChanceMultiplier * Number(directObject);
            health += aObjectHealthMultiplier * Number(directObject);
            damage += actionDamageMultiplier * Number(directObject);
            objectId = directObject;
        }
    }
    catch (err) {
        log.debug("error at liveFeed object: " + err);
        return;
    }
    //chance to hit
    var chanceInt = Math.floor(chance);
    //if(Math.floor(Math.random() * 10000) >= chanceInt) return; // the feed didn't go through
    //we need the user displayname
    var playerInfo = server.GetPlayerCombinedInfo(
    {
        PlayFabId: actor,
        InfoRequestParameters: { "GetUserAccountInfo": true }
    });
    var username;
    try {
        username = playerInfo.InfoResultPayload.AccountInfo.TitleInfo.DisplayName
    }
    catch (err) {
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
        Keys: ["LiveFeed"]
    });
    if (liveFeed.Data["LiveFeed"] == undefined) return;
    var liveFeedArray = JSON.parse(liveFeed.Data.LiveFeed);

    //let's apply DecayOverTime to each livefeed item
    if (ApplyDamageOverTimeToFeed(liveFeedArray, decayVal) != "OK") return;
    var newFeed;
    try {
        if ((Number(maxFeedLength) <= Number(liveFeedArray.length)) || (isUniqueAction == true)) {// replace with one
            newFeed = new Array(liveFeedArray.length);
            var found = false;
            for (var i = 0; i < liveFeedArray.length; i++) {
                if (
                   ((liveFeedArray[i].Action == actionId) && (isUniqueAction == true))
                   ||
                   ((liveFeedArray[i].currentHealth < damage) && (isUniqueAction == false))
                   ) {
                    found = true;
                    liveFeedArray.splice(i, 1);
                    break;
                }
            }
            if (found == false) {
                liveFeedArray.splice(newFeed.length - 1, 1);
            }

            for (var i = 0; i < liveFeedArray.length; i++) {
                if (liveFeedArray[i].currentHealth < health) {
                    liveFeedArray.splice(i, 0, feedObject);
                    newFeed = liveFeedArray;
                    break;
                }
            }
        }
        else {//add feed object
            newFeed = new Array(liveFeedArray.length + 1);
            newFeed[liveFeedArray.length] = feedObject;
            for (var i = 0; i < liveFeedArray.length; i++) {
                newFeed[i] = liveFeedArray[i];
                if (
                ((liveFeedArray[i].currentHealth < health) && (isUniqueAction == false)) || // sort by health
                ((liveFeedArray[i].Action == actionId) && (isUniqueAction == true)) //replace unique action
                ) {
                    newFeed[i] = feedObject;
                    for (var j = i; j < liveFeedArray.length; j++) {
                        newFeed[j + 1] = liveFeedArray[j];
                    }
                    break;
                }
            }
        }
    }
    catch (err) {
        log.debug("found error at feed replace/add: " + err);
        return;
    }
    for (var i = 0; i < newFeed.length; i++) {
        if (newFeed[i] == null) return; // hotfix
    }
    var dataToUpdate = JSON.stringify(newFeed);
    var updateFeed = server.SetTitleInternalData(
        {
            Key: "LiveFeed",
            Value: dataToUpdate
        }
        );
}

function ApplyDamageOverTimeToFeed(feedList, DoT) {
    //let's check the feed array integrity first
    if (feedList.length == undefined) return "Error";
    var d = new Date();
    var currentTimeStamp = d.getTime();
    var dotDamage = 0;
    for (var i = 0; i < feedList.length; i++) {
        try {
            dotDamage = Math.abs((Number(feedList[i].ts) - Number(currentTimeStamp))) * Number(DoT);
            dotDamage = dotDamage / 60000; //it's damage per minute
            dotDamage = Math.floor(dotDamage);
            feedList[i].currentHealth = Math.max((Number(feedList[i].health) - Number(dotDamage)), 0);
        }
        catch (err) {
            feedList.splice(i, 1);
        }
    }
    return "OK";
}

function updateUserProfileInfo(userId, carInfo) {
    var profileInfoObj = {};
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
        Key: "UserProfileInfo",
        Value: JSON.stringify(profileInfoObj)
    });

    var playerData = server.UpdateUserReadOnlyData(
    {
        PlayFabId: userId,
        Data: dict,
        Permission: "Public"
    }
  );
    log.debug("playerData is: " + playerData);
}

function updateCurrencySpentStatistic(currType, amount) {
    var suArray = [];
    var statName;
    var currValue = 0;
    var changeValue = Number(amount);
    if (isNaN(changeValue) || changeValue <= 0) return;
    if (currType == "SC") statName = "MoneySpent";
    if (currType == "HC") statName = "GoldSpent";
    if (statName == undefined) return;
    var ps = server.GetPlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        StatisticNames: [statName]
    });
    if (ps.Statistics.length > 0) {
        currValue = Number(ps.Statistics[0].Value);
    }
    currValue += changeValue;
    var su = { StatisticName: statName, Version: "0", Value: currValue };
    suArray.push(su);
    var updateRequest = server.UpdatePlayerStatistics(
      {
          PlayFabId: currentPlayerId,
          Statistics: suArray
      }
      );
}

function checkBalance(currType, cost, userSCBalance, userHCBalance) {
    if (currType == "SC") {
        if (userSCBalance < cost)
            return generateFailObj("NotEnoughSC");
    }
    else {
        if (userHCBalance < cost)
            return generateFailObj("NotEnoughHC");
    }
    return "OK";
}

function calculateLeague(currentTrophies) {
    var league = 1;
    var td = server.GetTitleData(
      {
          Keys: ["LeagueSubdivisions", "SubdivisionTrophyRanges"]
      });
    if (td.Data["LeagueSubdivisions"] == undefined) return league;
    if (td.Data["SubdivisionTrophyRanges"] == undefined) return league;
    var leaguesSubdivisions = JSON.parse(td.Data.LeagueSubdivisions);
    var leaguesSubdivisionsParsed = leaguesSubdivisions.leagues;
    var sdvtr = JSON.parse(td.Data.SubdivisionTrophyRanges);
    var sdvtrParsed = sdvtr.subdivisions;

    for (var i = 0; i < leaguesSubdivisionsParsed.length; i++) {
        if (Number(currentTrophies) > Number(sdvtrParsed[leaguesSubdivisionsParsed[i]]))
            continue;
        return i;
    }
    return leaguesSubdivisionsParsed.length - 1;
}

function recalculateCarPr(CarData, carId, _carCardsCatalog, _partsCardCatalog) {
    var pr = 0;
    var carCardsCatalog;
    if (_carCardsCatalog === undefined) {
        carCardsCatalog = server.GetCatalogItems(
          {
              CatalogVersion: "CarCards"
          }
        );
    }
    else {
        carCardsCatalog = _carCardsCatalog;
    }
    for (var i = 0; i < carCardsCatalog.Catalog.length; i++) {
        if (carCardsCatalog.Catalog[i].ItemId == carId) {
            var carCardInfo = JSON.parse(carCardsCatalog.Catalog[i].CustomData);
            pr = parseInt(carCardInfo.basePr) + getObjectValueFromLevel(carCardInfo, "prPerLvl", CarData.CarLvl);
            break;
        }
    }

    //calcualte pr based on each part level
    var partCardsCatalog;
    if (_partsCardCatalog === undefined) {
        partCardsCatalog = server.GetCatalogItems(
          {
              CatalogVersion: "PartCards"
          }
        );
    }
    else {
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
    for (i = 0; i < partCardsCatalog.Catalog.length; i++) //refactored
    {
        partCardInfo = JSON.parse(partCardsCatalog.Catalog[i].CustomData);
        pr += getObjectValueFromLevel(partCardInfo, "prPerLvl", Number(tempDict[partCardsCatalog.Catalog[i].ItemId]));
    }
    return pr;
}

function GenerateBlackMarket(currentPlayerId) {
    //getting user league
    var league = 1;
    var ps = server.GetPlayerStatistics(
      {
          PlayFabId: currentPlayerId,
          StatisticNames: ["League"]
      });

    if (ps.Statistics.length != 0) {
        league = ps.Statistics[0].Value.toString();
    }
    if (Number(league) <= 0) league = 1; // clamped
    //getting parts
    var partsCatalog = server.GetCatalogItems(
      {
          CatalogVersion: "PartCards"
      }
    );
    //getting bias numbers for rare, common and epic chance
    var tK = ["BlackMarketResetMinutes", "BlackMarketRarityBias"];
    var tData = server.GetTitleData(
      {
          PlayFabId: currentPlayerId,
          Keys: tK
      }
    );
    var bias = tData.Data.BlackMarketRarityBias;
    var biasParsed = JSON.parse(bias);
    //let's create a common parts list, a rare parts list and an epic parts list
    var partCardParsed;
    var commonParts = [];
    var rareParts = [];
    var epicParts = [];
    for (var i = 0; i < partsCatalog.Catalog.length; i++) {
        partCardParsed = JSON.parse(partsCatalog.Catalog[i].CustomData)
        if (partCardParsed == undefined) return generateErrObj("Part card " + partsCatalog.Catalog[i].ItemId + " has no custom data.");
        if (partCardParsed.rarity == 0) commonParts.push(partsCatalog.Catalog[i].ItemId + "_" + partCardParsed.BMCurrType + "_" + partCardParsed.BMbasePrice + "_" + 0 + "_" + partCardParsed.BMpriceIncrPerBuy);
        if (partCardParsed.rarity == 1) rareParts.push(partsCatalog.Catalog[i].ItemId + "_" + partCardParsed.BMCurrType + "_" + partCardParsed.BMbasePrice + "_" + 0 + "_" + partCardParsed.BMpriceIncrPerBuy);
        if (partCardParsed.rarity == 2) epicParts.push(partsCatalog.Catalog[i].ItemId + "_" + partCardParsed.BMCurrType + "_" + partCardParsed.BMbasePrice + "_" + 0 + "_" + partCardParsed.BMpriceIncrPerBuy);
    }

    var dataToUpdate = {};
    var d = new Date();
    dataToUpdate["BMTime"] = d.getTime();
    //get first part. It is always common
    var part0Index = Math.floor(Math.random() * commonParts.length);
    dataToUpdate["BMItem0"] = commonParts[part0Index];
    if (commonParts.length >= 2) commonParts.splice(part0Index, 1);
    //generate second car card

    var searchArray = commonParts;
    if (Math.floor(Math.random() * 100) < Number(biasParsed.parts[2])) //biasParsed.parts[2]% chance to be the epic card
        searchArray = epicParts;
    else {
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
          CatalogVersion: "CarCards"
      }
    );
    var carCardParsed;
    var commonIndexes = [];
    var rareIndexes = [];
    var epicIndexes = [];
    for (var i = 0; i < carsCatalog.Catalog.length; i++) {
        carCardParsed = JSON.parse(carsCatalog.Catalog[i].CustomData)
        if (carCardParsed == undefined) return generateErrObj("Car card " + carsCatalog.Catalog[i].ItemId + " has no custom data.");
        if (Number(carCardParsed.unlockedAtRank) >= (Number(league) + 1)) continue;
        if (carCardParsed.rarity == "0") commonIndexes.push(carsCatalog.Catalog[i].ItemId + "_" + carCardParsed.BMCurrType + "_" + carCardParsed.BMbasePrice + "_" + 0 + "_" + carCardParsed.BMpriceIncrPerBuy);
        if (carCardParsed.rarity == "1") rareIndexes.push(carsCatalog.Catalog[i].ItemId + "_" + carCardParsed.BMCurrType + "_" + carCardParsed.BMbasePrice + "_" + 0 + "_" + carCardParsed.BMpriceIncrPerBuy);
        if (carCardParsed.rarity == "2") epicIndexes.push(carsCatalog.Catalog[i].ItemId + "_" + carCardParsed.BMCurrType + "_" + carCardParsed.BMbasePrice + "_" + 0 + "_" + carCardParsed.BMpriceIncrPerBuy);
    }
    var carIdx = Math.floor(Math.random() * commonIndexes.length);
    dataToUpdate["BMItem2"] = commonIndexes[carIdx];
    if (commonIndexes.length >= 2) commonIndexes.splice(carIdx, 1);

    if (rareIndexes.length <= 0) {
        if (epicIndexes.length <= 0) {
            rareIndexes = commonIndexes;
            epicIndexes = commonIndexes;
        }
        else {
            rareIndexes = epicIndexes;
        }
    }
    if (epicIndexes.length <= 0) {
        epicIndexes = rareIndexes;
    }

    var carSearchArray = commonIndexes;
    if (Math.floor(Math.random() * 100) < Number(biasParsed.cars[2])) //biasParsed.cars[2]% chance to be the epic card
        carSearchArray = epicIndexes;
    else {
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
          PlayFabId: currentPlayerId,
          Data: dataToUpdate
      }
    );
    dataToUpdate["BMTime"] = parseInt(tData.Data.BlackMarketResetMinutes) * 60;
    return dataToUpdate;
}

function GetCurrentBlackMarket(currentPlayerId, getInternalDataResult) {
    var bmObj = {};
    var d = new Date();

    var tK = [];
    tK.push("BlackMarketResetMinutes");
    var tData = server.GetTitleData(
      {
          PlayFabId: currentPlayerId,
          Keys: tK
      }
    );

    bmObj["BMTime"] = parseInt(tData.Data.BlackMarketResetMinutes) * 60 - Math.floor((d.getTime() - getInternalDataResult.Data.BMTime.Value) / 1000);
    for (var i = 0; i < 4; i++) {
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
function GetValueFromStatistics(statisticsArray, statisticsName, defaultValue) {
    var stat;
    //find statistic with given name
    for (var i = 0; i < statisticsArray.length; i++)
        if (statisticsArray[i].StatisticName === statisticsName)
            stat = statisticsArray[i];
    if (stat === undefined)
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
function GetVersionFromStatistics(statisticsArray, statisticsName, defaultValue) {
    var stat;
    //find statistic with given name
    for (var i = 0; i < statisticsArray.length; i++)
        if (statisticsArray[i].StatisticName === statisticsName)
            stat = statisticsArray[i];
    //log.debug("Stat with name statisticsName: " + statisticsName + " is " + stat);
    if (stat === undefined)
        return defaultValue !== undefined ? defaultValue : 0;
    else
        return Number(stat.Version);
}
/**
* Returns catalog item or undifined
* @param {string} catalogId the catalog id of the requested item
* @param {string} itemId of the recuested item
*/
function getCatalogItem(catalogId, itemId) {
    var items = server.GetCatalogItems({ CatalogVersion: catalogId });
    for (var i = 0; i < items.Catalog.length; i++) {
        if (items.Catalog[i].ItemId === itemId)
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
    if (!defaultValue) defaultValue = 0;
    if (!holdingObject[itemId] || !holdingObject[itemId].length) return defaultValue;

    // clamp ln to lenght is it can't get out of bounds
    var ln = Number(holdingObject[itemId].length);
    if (level >= ln) level = ln - 1;
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
function GiveUserPart(partName, amount0, amount1, inventoryObject) {
    GiveUserCard(partName, "PartsCards", amount0, amount1, inventoryObject);
}

function GiveUserCarCard(cardName, amount0, amount1, inventoryObject) {
    GiveUserCard(cardName, "CarCards", amount0, amount1, inventoryObject);
}

function GiveUserCard(cardName, catalogName, amount0, amount1, inventoryObject) {
    var cardsAmount;
    if (Number(amount0) < Number(amount1)) {
        cardsAmount = Number(amount0) + Math.floor(Math.random() * (Number(amount1) - Number(amount0)));
    }
    else {
        cardsAmount = Number(amount0);
    }
    log.debug("cardsAmount: " + cardsAmount);
    var cardInstance;
    var newAmount;
    for (var i = 0; i < inventoryObject.Inventory.length; i++) {
        if ((inventoryObject.Inventory[i].ItemId == cardName) && (inventoryObject.Inventory[i].CatalogVersion == catalogName)) // user has part so only change the Amount Custom Data field
        {
            cardInstance = inventoryObject.Inventory[i].ItemInstanceId;
            if (inventoryObject.Inventory[i].CustomData == undefined) {
                newAmount = cardsAmount;
            }
            else {
                if (inventoryObject.Inventory[i].CustomData.Amount == undefined)
                    newAmount = cardsAmount;
                else
                    if (isNaN(Number(inventoryObject.Inventory[i].CustomData.Amount)))
                        newAmount = cardsAmount;
                    else
                        newAmount = Number(inventoryObject.Inventory[i].CustomData.Amount) + Number(newAmount); // this is the nothing went wrong branch
            }

            break; // for break
        }
    } // end for

    if (cardInstance == undefined) {
        newAmount = cardsAmount;
        var itemsToGive = [];
        itemsToGive.push(cardName);
        var grantRequest = server.GrantItemsToUser(
          {
              CatalogVersion: catalogName,
              PlayFabId: inventoryObject.PlayFabId,
              ItemIds: itemsToGive
          }
          );
        cardInstance = grantRequest.ItemGrantResults[0].ItemInstanceId;
        if (cardInstance === undefined)
            return generateErrObj("grantRequest denied");
    }

    var itemData = { "Amount": newAmount };
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
          ItemId: cardName,
          CatalogVersion: catalogName,
          CustomData: itemData
      }

    return dataChanged;
}
//Chest Generation functions
function GetRandomCard(cardList, arenaLevel) {
    if (cardList == undefined) return "ERROR";
    if (cardList.length == undefined) return "ERROR";
    if (cardList.length <= 0) return "ERROR";
    var randIndex = Math.floor(Math.random() * cardList.length);
    return cardList[randIndex];
}

function AddCardToListOfStacks(catalog, rarityCardsListFinal, card, canCreateNewStack) {
    if (rarityCardsListFinal == undefined) {
        rarityCardsListFinal =
        [
          {
              ItemId: card,
              CatalogVersion: catalog,
              CustomData: { "Amount": 1 }
          }
        ];
        return rarityCardsListFinal;
    }

    for (var i = 0; i < rarityCardsListFinal.length; i++) {
        if (rarityCardsListFinal[i].ItemId == card) {
            rarityCardsListFinal[i].CustomData.Amount = Number(rarityCardsListFinal[i].CustomData.Amount) + 1;
            return rarityCardsListFinal;
        }
    }

    if (canCreateNewStack == true) {
        var obj = {
            ItemId: card,
            CatalogVersion: catalog,
            CustomData: { "Amount": 1 }
        }
        rarityCardsListFinal.push(obj);
        return rarityCardsListFinal;
    }
    else {
        rarityCardsListFinal[Math.floor(Math.random() * rarityCardsListFinal.length)].CustomData.Amount = Number(rarityCardsListFinal[Math.floor(Math.random() * rarityCardsListFinal.length)].CustomData.Amount) + 1;
        return rarityCardsListFinal;
    }
}

function WeightedRandom(array, totalweight) {
    try {
        var totalWeight = 0;
        for (var i = 0; i < array.length; i++) {
            totalWeight += Number(array[i]);
        }
        var rand = Math.floor(Math.random() * Number(totalWeight));
        for (var i = 0; i < array.length; i++) {
            if (rand <= Number(array[i])) // we found it
            {
                return i;
            }
            rand -= Number(array[i]);
        }
        return 0;
    }
    catch (err) {
        log.debug(err);
        return 0;
    }
} handlers.buyChest = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    var userInventoryObject = server.GetUserInventory(
    {
        PlayFabId: currentPlayerId
    });

    var bO = checkBalance(args.curr, args.cost, userInventoryObject.VirtualCurrency.SC, userInventoryObject.VirtualCurrency.HC);
    if (bO != "OK") return generateFailObj("not enough money");
    if (args.cost > 0) {
        var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
        {
            PlayFabId: currentPlayerId,
            VirtualCurrency: args.curr,
            Amount: args.cost
        }
        );
        updateCurrencySpentStatistic(args.curr, args.cost);
        var cU = {};
        cU[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
        return generateInventoryChange("ChestBought", { VirtualCurrency: cU });
    }
    else {
        return generateInventoryChange("ChestBought", {});
    }
};
handlers.buyPremiumChest = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);
    //let's figure out the user's league
    var tc = server.GetPlayerStatistics(
	  {
	      PlayFabId: currentPlayerId,
	      StatisticNames: ["TrophyCount"]
	  });
    var trophyCount = 0;
    if (tc.Statistics.length != 0) {
        trophyCount = tc.Statistics[0].Value;
    }
    trophyCount = Number(trophyCount);
    var cLeague = Number(calculateLeague(trophyCount));

    //let's get the catalog data for chests
    var catalogData = server.GetCatalogItems({ CatalogVersion: "Chests" });

    //let's get the chestInfo for freeChest
    var chestInfo;
    var chestPrice;
    for (var i = 0; i < catalogData.Catalog.length; i++) {
        if (catalogData.Catalog[i].ItemId == args.chestId) {
            chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
            chestPrice = catalogData.Catalog[i].VirtualCurrencyPrices.HC; //these chests will only cost HC hopefully
            if (chestPrice == undefined) return generateErrObj("Chest has INVALID PRICE TAG");
            break;
        }
    }
    if (chestInfo == undefined) return generateErrObj("Could not find chest with id: " + args.chestId + " in the Chests catalog, or this chest's custom data is undefined");

    //let's check if the user can afford the chest
    //let's see what the chest costs

    //we now have to querry the user's inventory to see if he has enough currency to purchase the chest
    var userInventoryObject = server.GetUserInventory(
		 {
		     PlayFabId: currentPlayerId
		 });

    if (Number(chestPrice) > Number(userInventoryObject.VirtualCurrency.HC)) return generateErrObj("Not enough HC.");

    //let's subtract chestPrice amount of gold from the user
    var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
	{
	    PlayFabId: currentPlayerId,
	    VirtualCurrency: "HC",
	    Amount: Number(chestPrice)
	});
    //update the CurrencySpent stat for this user
    updateCurrencySpentStatistic("HC", chestPrice);

    //let's roll for chest bounty
    var chestBounty = GenerateChestBounty(currentPlayerId, args.chestId, cLeague, chestInfo);

    //let's get the new user inventory
    var outInventory = server.GetUserInventory({ PlayFabId: currentPlayerId });
    var totalXp = UpdateExperience("Chests", args.chestId, "xpGain", 0, true);
    outInventory.Experience = totalXp;

    var returnObject =
	{
	    Result: "OK",
	    ChestBounty: chestBounty,
	    InventoryChange: outInventory
	}

    //let's publish to the feed
    publishToLiveFeed(currentPlayerId, "unlockedChest", args.chestId);

    return returnObject;
}
handlers.claimDailyMission = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    var idx = Number(args.mIdx);
    var dStatus = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["DailyMissionStatus"]
	});
    if (dStatus.Data.DailyMissionStatus == undefined) {
        return generateErrObj("No daily mission data found on server");
    }

    var tData = server.GetTitleData(
	    {
	        PlayFabId: currentPlayerId,
	        Keys: ["DailyMissionData"]
	    }
	      );

    var tParsed = JSON.parse(tData.Data.DailyMissionData);
    var dataArr = tParsed.missionData[idx].split("_");

    var parsedData = JSON.parse(dStatus.Data.DailyMissionStatus.Value);
    var DailyMissionClaimStatus = parsedData.dailyMissionClaimStatus;

    if (idx >= DailyMissionClaimStatus.length) {
        return generateErrObj("Unlock index is out of bounds of playerData claim mission status array");
    }
    if (DailyMissionClaimStatus[idx] == 1) return generateFailObj("Mission already claimed");
    DailyMissionClaimStatus[idx] = 1;

    var dailyObject =
	{
	    "DailyStatus": parsedData.DailyStatus,
	    "dailyMissionClaimStatus": DailyMissionClaimStatus,
	    "timeStamp": parsedData.timeStamp
	};
    var dailyObjectStringified = JSON.stringify(dailyObject);
    var objectToUpdate =
	{
	    "DailyMissionStatus": dailyObjectStringified
	}
    server.UpdateUserInternalData(
       {
           PlayFabId: currentPlayerId,
           Data: objectToUpdate
       });

    var rewardCurrency;
    var rewardAmount;
    if (idx >= tParsed.missionData.length) {
        return generateErrObj("Unlock index is out of bounds of titleData claim mission reward array");
    }

    rewardCurrency = dataArr[1];
    rewardAmount = Number(dataArr[2]);

    var addUserCurrencyResult = server.AddUserVirtualCurrency(
      {
          PlayFabId: currentPlayerId,
          VirtualCurrency: rewardCurrency,
          Amount: rewardAmount
      }
    );
    var currencyUpdated = {};
    currencyUpdated[addUserCurrencyResult.VirtualCurrency] = addUserCurrencyResult.Balance;
    var invChangeObj =
    {
        VirtualCurrency: currencyUpdated
    };
    return generateInventoryChange("MissionClaimed", invChangeObj);
}
handlers.endDaily = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    var dStatus = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["DailyMissionStatus"]
	});
    if (dStatus.Data.DailyMissionStatus == undefined) {
        return generateErrObj("No daily mission data found on server");
    }

    var tData = server.GetTitleData(
         {
             PlayFabId: currentPlayerId,
             Keys: ["DailyMissionData"]
         }
       );
    var totalMinutes = 600;
    tParsed = JSON.parse(tData.Data.DailyMissionData);
    totalMinutes = Number(tParsed.minutesToRefresh);

    var parsedData = JSON.parse(dStatus.Data.DailyMissionStatus.Value);
    var DailyMissionClaimStatus = parsedData.dailyMissionClaimStatus;
    var DailyStatus = Number(parsedData.DailyStatus);
    var TimeRemaining = -1;


    var dataArr;
    for (var i = 0; i < tParsed.missionData.length; i++) {
        dataArr = tParsed.missionData[i].split("_");
        if (dataArr.length < 4) generateErrObj("Title data is invalid!");
        if (dataArr[3] == "OFF") DailyMissionClaimStatus[i] = -1;
    }


    for (var i = 0; i < parsedData.dailyMissionClaimStatus.length; i++) {
        if (DailyMissionClaimStatus[i] == -1) continue; //we don't care aboot these missions anymore
        if (DailyMissionClaimStatus[i] == 0) return generateErrObj("Not all missions were claimed!");
    }
    //all missions claimed so let's give the player what they are due and set the daily mission status

    DailyMissionClaimStatus = [0, 0, 0, 0, 0, 0, 0, 0];

    var d = new Date();
    var timeStamp;
    if (d.getTime() - Number(parsedData.timeStamp) > Number(totalMinutes) * 60 * 1000) // minutes *60*1000
    { // we need to generate a new daily mission for the user in this case
        DailyStatus = 2; //0 <- waiting for daily timer, 1 <- generate daily, 2 <- daily is ongoing
        timeStamp = d.getTime();
    }
    else {
        DailyStatus = 0;
        TimeRemaining = (Number(totalMinutes) * 60) - (Math.floor((d.getTime() - Number(parsedData.timeStamp)) / 1000)); // time remaining till next quest in seconds
        timeStamp = parsedData.timeStamp;
    }

    var dailyObject =
	{
	    "DailyStatus": DailyStatus,
	    "dailyMissionClaimStatus": DailyMissionClaimStatus,
	    "timeStamp": timeStamp
	};
    var dailyObjectStringified = JSON.stringify(dailyObject);
    var objectToUpdate =
	{
	    "DailyMissionStatus": dailyObjectStringified
	}
    server.UpdateUserInternalData(
	      {
	          PlayFabId: currentPlayerId,
	          Data: objectToUpdate
	      });
    /*
          var invChangeObj;
          var userInventoryObject = server.GetUserInventory(
            {
              PlayFabId: currentPlayerId
            }
          );
          var addUserCurrencyResult;
          for(var p in args.currencyReq)
          {
            if(args.currencyReq[p] > 0)
            addUserCurrencyResult = server.AddUserVirtualCurrency(
              {
                PlayFabId: currentPlayerId,
                VirtualCurrency : p,
                Amount: args.currencyReq[p]
              }
            );
          }
          var itemData;
          var itemFound = false;
          var newAmount = 0;
          //car cards
          for(var p in args.carCardsRequest)
          {
            //log.debug(p + " : " + args.carCardsRequest[p]);
            if (args.carCardsRequest.hasOwnProperty(p))
            {
              itemFound = false;
              newAmount = 0;
              //log.debug("looking for: " +p);
              for(var i = 0; i < userInventoryObject.Inventory.length; i++)
              {
                if((userInventoryObject.Inventory[i].ItemId == p) && (userInventoryObject.Inventory[i].CatalogVersion == "CarCards"))
                {
                  // log.debug("adding amount to: " + userInventoryObject.Inventory[i].ItemInstanceId);
                  if(userInventoryObject.Inventory[i].CustomData == undefined)
                  {
                    newAmount = Number(args.carCardsRequest[p]);
                  }
                  else
                  {
                    if(userInventoryObject.Inventory[i].CustomData.Amount == undefined)
                    newAmount = Number(args.carCardsRequest[p]);
                    else
                    {
                      if(isNaN(Number(userInventoryObject.Inventory[i].CustomData.Amount)))
                      newAmount = Number(args.carCardsRequest[p]);
                      else
                      newAmount = Number(userInventoryObject.Inventory[i].CustomData.Amount) + Number(args.carCardsRequest[p]);
                    }
                  }
                  itemData = {"Amount" : newAmount};
                  server.UpdateUserInventoryItemCustomData(
                    {
                      PlayFabId: currentPlayerId,
                      ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
                      Data: itemData
                    }
                  );
                  itemFound = true;
                  break;
                }
              }
              if(itemFound == false)
              {
                var itemsToGrant = [p];
                var grantVar = server.GrantItemsToUser(
                  {
                    CatalogVersion : "CarCards",
                    PlayFabId: currentPlayerId,
                    ItemIds : itemsToGrant
                  }
                );
                itemData = {"Amount" : args.carCardsRequest[p]};
                server.UpdateUserInventoryItemCustomData(
                  {
                    PlayFabId: currentPlayerId,
                    ItemInstanceId: grantVar.ItemGrantResults[0].ItemInstanceId,
                    Data: itemData
                  }
                );
              }
            }
          }
          //part cards
          for(var p in args.partCardsRequest)
          {
            //log.debug(p + " : " + args.partCardsRequest[p]);
            if (args.partCardsRequest.hasOwnProperty(p))
            {
              itemFound = false;
              newAmount = 0;
              // log.debug("looking for: " +p);
              for(var i = 0; i < userInventoryObject.Inventory.length; i++)
              {
                if((userInventoryObject.Inventory[i].ItemId == p) && (userInventoryObject.Inventory[i].CatalogVersion == "PartCards"))
                {
                  // log.debug("adding amount to: " + userInventoryObject.Inventory[i].ItemInstanceId);
                  if(userInventoryObject.Inventory[i].CustomData == undefined)
                  {
                    newAmount = Number(args.partCardsRequest[p]);
                  }
                  else
                  {
                    if(userInventoryObject.Inventory[i].CustomData.Amount == undefined)
                    newAmount = Number(args.partCardsRequest[p]);
                    else
                    {
                      if(isNaN(Number(userInventoryObject.Inventory[i].CustomData.Amount)))
                      newAmount = Number(args.partCardsRequest[p]);
                      else
                      newAmount = Number(userInventoryObject.Inventory[i].CustomData.Amount) + Number(args.partCardsRequest[p]);
                    }
                  }
                  itemData = {"Amount" : newAmount};
                  server.UpdateUserInventoryItemCustomData(
                    {
                      PlayFabId: currentPlayerId,
                      ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
                      Data: itemData
                    }
                  );
                  itemFound = true;
                  break;
                }
              }
              if(itemFound == false)
              {
                var itemsToGrant = [p];
                var grantVar = server.GrantItemsToUser(
                  {
                    CatalogVersion : "PartCards",
                    PlayFabId: currentPlayerId,
                    ItemIds : itemsToGrant
                  }
                );
                itemData = {"Amount" : args.partCardsRequest[p]};
                server.UpdateUserInventoryItemCustomData(
                  {
                    PlayFabId: currentPlayerId,
                    ItemInstanceId: grantVar.ItemGrantResults[0].ItemInstanceId,
                    Data: itemData
                  }
                );
              }
            }
          }
    */
    //let's get user leage info
    var tc = server.GetPlayerStatistics(
	  {
	      PlayFabId: currentPlayerId,
	      StatisticNames: ["TrophyCount"]
	  });
    var trophyCount = 0;
    if (tc.Statistics.length != 0) {
        trophyCount = tc.Statistics[0].Value;
    }
    trophyCount = Number(trophyCount);
    var cLeague = Number(calculateLeague(trophyCount));
    //let's get the catalog data for daily mission chest
    var catalogData = server.GetCatalogItems({ CatalogVersion: "Chests" });
    var chestInfo;
    for (var i = 0; i < catalogData.Catalog.length; i++) {
        if (catalogData.Catalog[i].ItemId == "DailyMissionChest") {
            chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
            break;
        }
    }
    if (chestInfo == undefined) return generateErrObj("Could not find chest with id: " + "DailyMissionChest" + " in the Chests catalog, or this chest's custom data is undefined");
    var chestBounty = GenerateChestBounty(currentPlayerId, "DailyMissionChest", cLeague, chestInfo);

    var outInventory = server.GetUserInventory({ PlayFabId: currentPlayerId });
    var dStObj =
    {
        status: DailyStatus,
        claimStatus: DailyMissionClaimStatus,
        timeRemaining: TimeRemaining
    };

    var r = {
        Result: "OK",
        Message: "DailyCompleted",
        ChestBounty: chestBounty,
        InventoryChange: outInventory,
        "DailyStatus": dStObj
    };
    return r;
}

handlers.endGame = function (args, context) {

    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);
    //let's get some relevant title wide data
    var titleDataRequest = server.GetTitleData(
    {
        Key: ["LeagueSubdivisions", "SubdivisionTrophyRanges", "RecUploadLock"]
    }
    );
    //let's update user trophies
    var trophyCount = 0;
    var initTrophyCount = 0;
    var tc = server.GetPlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        StatisticNames: ["TrophyCount"]
    });
    if (tc.Statistics.length != 0) {
        trophyCount = tc.Statistics[0].Value;
        if (args.debug == true) log.debug("getting trophy count " + tc.Statistics[0].Value);
    }
    trophyCount = Number(trophyCount);
    initTrophyCount = trophyCount;
    var pDat = server.GetUserInternalData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["trophyLose", "trophyWin", "LastGameOutcome", "LatestStreak"]
    });
    var refund;
    //log.debug("pDat.Data[trophyLose] " + pDat.Data["trophyLose"].Value);
    //log.debug("pDat.Data[trophyWin] " + pDat.Data["trophyWin"].Value);
    if ((pDat.Data["trophyLose"] == undefined) || (pDat.Data["trophyWin"] == undefined)) refund = 45;
    else refund = Number(pDat.Data["trophyLose"].Value) + Number(pDat.Data["trophyWin"].Value);
    //log.debug("refund: " + refund);

    //previous game data
    var latestStreak = 0;
    var lastMatchOutcome = "Loss";
    if (pDat.Data["LatestStreak"] != undefined) latestStreak = Number(pDat.Data["LatestStreak"].Value);
    if (isNaN(latestStreak) == true) latestStreak = 0;
    if (pDat.Data["LatestStreak"] != undefined) lastMatchOutcome = pDat.Data["LastGameOutcome"].Value;
    if (lastMatchOutcome == undefined) lastMatchOutcome = "Loss";

    var dataToUpdate =
    {
        "quitLastGame": "false",
        "LastGameOutcome": "Loss"
    }


    if (args.outcome == "rWin") {
        trophyCount += refund;
        dataToUpdate["LastGameOutcome"] = "Win";
        if (lastMatchOutcome == "Loss") latestStreak = 1;
        else latestStreak++;

        //Let's check the leaderboard and see if our player is in the top
        var isKing = false;
        ldata = server.GetLeaderboard(
        {
            StatisticName: "TrophyCount",
            StartPosition: 0,
            MaxResultsCount: 1
        });

        //this is for the livefeed
        if (ldata.Leaderboard != null) {
            if (args.debug == true) log.debug("leaderboardData: " + ldata.Leaderboard[0]);
            if (ldata.Leaderboard[0].PlayFabId == currentPlayerId) //looks like our player is already top of the leaderboard
            {
                if (args.debug == true) log.debug("ALREADY IN FIRST PLACE IN LEADERBOARD");
                isKing = true;
            }
            else {
                if (args.debug == true) log.debug("WASN'T FIRST PLACE");
                if (Number(ldata.Leaderboard[0].StatValue) < trophyCount) // he wasn't before but he sure is now
                {
                    if (args.debug == true) log.debug("BUT HE IS NOW!");
                    publishToLiveFeed(currentPlayerId, "topPlayer", trophyCount);
                }
                if (args.debug == true) log.debug("DIFF: " + Number(ldata.Leaderboard[0].StatValue) + " vs " + trophyCount);
            }
        }
    }

    dataToUpdate["LatestStreak"] = latestStreak;

    server.UpdateUserInternalData(
        {
            PlayFabId: currentPlayerId,
            Data: dataToUpdate
        });

    var recHeader = JSON.parse(args.recordingHeader);
    //let's update the total wins/ total losses statistics
    var ms = server.GetPlayerStatistics( //miscelanious statistics
    {
        PlayFabId: currentPlayerId,
        StatisticNames: ["Wins", "TotalGamesCompleted", "LongestWinStreak", "BestDriftScore", "HighestLeagueReached", "TotalGames"]
    }).Statistics;
    var cLeague = calculateLeague(trophyCount);
    var totalGamesCompleted = GetValueFromStatistics(ms, "TotalGamesCompleted", 0);
    var isTutorial = false;
    var totalGamesStarted = GetValueFromStatistics(ms, "TotalGames", 0);
    if (Number(totalGamesStarted) <= 1) isTutorial = true;


    totalGamesCompleted = Number(totalGamesCompleted) + 1;
    var totalWins = GetValueFromStatistics(ms, "Wins", 0);
    if (args.outcome == "rWin")
        totalWins = Number(totalWins) + 1;
    var longestStreak = GetValueFromStatistics(ms, "LongestWinStreak", 0);
    var longestStreakVersion = GetVersionFromStatistics(ms, "LongestWinStreak", 0);
    if (Number(longestStreak) < latestStreak) {
        longestStreak = latestStreak;
        if (cLeague > 2) {
            if (Number(longestStreak) == 10)
                publishToLiveFeed(currentPlayerId, "winStreak", 10);
            if (Number(longestStreak) == 15)
                publishToLiveFeed(currentPlayerId, "winStreak", 15);
            if (Number(longestStreak) == 20)
                publishToLiveFeed(currentPlayerId, "winStreak", 20);
        }
    }
    var bestScore = GetValueFromStatistics(ms, "BestDriftScore", 0);
    if (Number(recHeader.Score) > bestScore)
        bestScore = Number(recHeader.Score);
    //log.debug("trophies change: " + initTrophyCount + " => " + trophyCount);

    var highestLeague = GetValueFromStatistics(ms, "HighestLeagueReached", 1);
    if (Number(cLeague) > Number(highestLeague)) {
        highestLeague = cLeague;
        if (highestLeague > 2) {
            publishToLiveFeed(currentPlayerId, "arenaUnlocked", Number(cLeague));
        }
    }
    //wlStatInt = 0;
    //for(var i = 0 ; i < wlStat.length; i++)
    //{
    //  if(wlStat[i] == "1")
    //    wlStatInt += Math.pow(2,i);
    //}
    //update stats on server
    var suArray = [];
    //var su = {StatisticName : "WinLoss", Version : "0", Value: wlStatInt};
    //suArray.push(su);
    var sut = { StatisticName: "TrophyCount", Value: trophyCount };
    suArray.push(sut);
    var sul = { StatisticName: "League", Value: cLeague };
    suArray.push(sul);
    var suw = { StatisticName: "Wins", Value: totalWins };
    suArray.push(suw);
    var sutg = { StatisticName: "TotalGamesCompleted", Value: totalGamesCompleted };
    suArray.push(sutg);
    var sulws = { StatisticName: "LongestWinStreak", Value: longestStreak };
    suArray.push(sulws);
    var subds = { StatisticName: "BestDriftScore", Value: bestScore };
    suArray.push(subds);
    var subhlr = { StatisticName: "HighestLeagueReached", Value: highestLeague };
    suArray.push(subhlr);
    var updateRequest = server.UpdatePlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        Statistics: suArray
    }
    );

    //stats have been updated, now let's grant the user a chest
    if (args.outcome == "rWin") {
        if (isTutorial == false) // we already gave him his tutorial chest
        {
            if (Number(totalGamesCompleted) > 4)
                grantUserChest(currentPlayerId, "endGameNormal");
            else
                grantUserChest(currentPlayerId, "endGameFreeWin");
        }
    }

    var uploadLock = false;//array of versions that cannot upload
    var RecUploadLockParsed;
    if (titleDataRequest.Data["RecUploadLock"] != undefined) {
        RecUploadLockParsed = JSON.parse(titleDataRequest.Data["RecUploadLock"]);
    }

    if (RecUploadLockParsed != undefined)
        for (var i = 0; i < RecUploadLockParsed.length; i++) {
            if (args.cVersion == RecUploadLockParsed[i]) {
                uploadLock = true;
                break;
            }
        }
    //if(Number(recHeader.Score) <= 100)
    if ((Number(recHeader.Score) <= 100) || (uploadLock == true)) {
        if (args.debug == true) log.debug("this recording will not be stored, but endgame stats still apply. clientVersion: " + args.cVersion + ". upload lock:  " + uploadLock);
        var newPlayerStats =
        {
            "TrophyCount": trophyCount,
            "League": cLeague
        }
        return { Result: newPlayerStats };
    }
    //let's see which Subdivision this player is in
    var sdval = titleDataRequest.Data["SubdivisionTrophyRanges"];
    var sdvalParsed = JSON.parse(sdval);
    //log.debug("SubdivisionTrophyRanges " + sdvalParsed);
    var subDivision = 43;
    for (var i = 0; i < sdvalParsed.subdivisions.length; i++) {
        if (initTrophyCount < sdvalParsed.subdivisions[i]) {
            subDivision = i;
            break;
        }
    }
    //log.debug("user is in subdivision " + subDivision);
    //let's save the player's recording
    var dict = [];
    dict.push({
        Key: args.envIndex + "_" + args.courseIndex + "_RecPos",
        Value: args.recordingPos
    });
    dict.push({
        Key: args.envIndex + "_" + args.courseIndex + "_RecRot",
        Value: args.recordingRot
    });
    dict.push({
        Key: args.envIndex + "_" + args.courseIndex + "_RecHeader",
        Value: args.recordingHeader
    });
    //log.debug("updating user read only data ");
    var playerData = server.UpdateUserReadOnlyData(
      {
          PlayFabId: currentPlayerId,
          Data: dict
      }
    );

    //log.debug("updated user read only data for " + currentPlayerId + " " + playerData);
    var titleDataVal = server.GetTitleInternalData(
      {
          Key: "RecSubDivision" + subDivision, //i.e RecSubDivision0,
      }
      );
    var recPool = titleDataVal.Data["RecSubDivision" + subDivision];
    //log.debug("recPool: " + recPool);
    var recArray;
    var titleKeyVal;
    if (recPool == undefined) {
        recArray = [];
        var recObj =
        {
            "e": args.envIndex,
            "c": args.courseIndex,
            "uId": currentPlayerId
        }
        recArray.push(recObj);
        titleKeyVal = JSON.stringify(recArray);
        //log.debug("recArray: " + titleKeyVal);
    }
    else {
        recArray = JSON.parse(recPool);
        //log.debug("recArray: " + recArray);
        var recObj =
        {
            "e": args.envIndex,
            "c": args.courseIndex,
            "uId": currentPlayerId
        }
        var uniqueKeyExists = false;
        //let's only keep 2 recordings per user per subdivision at max
        var currentOccurencesOfPlayer = 0;
        for (var i = 0; i < recArray.length; i++) {
            if (recArray[i].uId == currentPlayerId)
                currentOccurencesOfPlayer++;
        }
        if (currentOccurencesOfPlayer > 2) // no use letting the user spam his recordings on the same subdivision
        {
            var newPlayerStats =
            {
                "TrophyCount": trophyCount,
                "League": cLeague
            }
            return { Result: newPlayerStats };
        }

        for (var i = 0; i < recArray.length; i++) {
            if ((recArray[i].e == args.envIndex) && (recArray[i].c == args.courseIndex)) {
                uniqueKeyExists = true;
                recArray[i] = recObj;
            }
        }
        if (uniqueKeyExists == false) {
            // log.debug("recArrayLNbefore: " + recArray.length);
            recArray.push(recObj);
            //log.debug("recArrayLNafter: " + recArray.length);
        }
        titleKeyVal = JSON.stringify(recArray);
        //	log.debug("titleKeyVal: " + titleKeyVal);
    }

    var titleData = server.SetTitleInternalData(
      {
          Key: "RecSubDivision" + subDivision, //Recording_0_0
          Value: titleKeyVal
      }
      );
    var newPlayerStats =
      {
          "TrophyCount": trophyCount,
          "League": cLeague
      };
    return { Result: newPlayerStats };
}
//call this only once to set title data for current season. Call this after logLegendRank and endSeasonUser tasks were called
handlers.endSeasonTitle = function (args, context) {
    //BACKUP
    //{"endSezonTimestamp":1488382264,"endSezonRewards":["DiamondChest","GoldChest","BigSilverChest"],"scConversionRate":5,"hcConversionRate":1,"defaultChest":"SilverChest"}
    //set time stamp for next month day 1 time 00:00. Sync this with the autmoated task in playfab of resetting the season
    //TEMP 5 minutes reset ladder
    log.debug("context: " + JSON.stringify(context));
    try {
        //let's get the end game variables
        var endGameData = server.GetTitleData(
		{
		    Keys: ["EndSezonObject"]
		});
        var endGameDataParsed;
        log.debug("1: " + endGameData);
        endGameDataParsed = JSON.parse(endGameData.Data.EndSezonObject);
        log.debug("2: " + endGameDataParsed);
        endGameDataParsed.endSezonTimestamp = Math.floor((new Date().getTime() / 1000)) + 60 * 60; // seconds - 5 minutes differentati
        log.debug("3: " + endGameDataParsed);
        server.SetTitleData(
		{
		    Key: "EndSezonObject",
		    Value: JSON.stringify(endGameDataParsed)
		});
        log.debug("4: " + endGameDataParsed);
    }
    catch (err) {
        log.debug("err: " + err);
    }
}
// call this for each user before calling endSeasonUser
handlers.logLegendRank = function (args, context) {
    try {
        //let's get the end game variables
        var endGameData = server.GetTitleData(
		{
		    Keys: ["EndSezonObject"]
		});
        var endGameDataParsed;
        var endGameRewardArray;
        try {
            endGameDataParsed = JSON.parse(endGameData.Data.EndSezonObject);
            //log.debug("endGameDataParsed: " + endGameDataParsed);
            endGameRewardArray = endGameDataParsed.endSezonRewards;
        }
        catch (err) {
            log.debug('err: ' + err);
            return;
        }

        var pos = server.GetLeaderboardAroundUser(
		{
		    StatisticName: "TrophyCount",
		    PlayFabId: currentPlayerId,
		    MaxResultsCount: 1
		}).Leaderboard[0].Position;

        //let's give appropriate chest
        if (pos < endGameRewardArray.length)
            server.UpdateUserReadOnlyData(
			{
			    PlayFabId: currentPlayerId,
			    Data: { "EndSeasonChest": endGameRewardArray[Number(pos)] }
			});

        pos = Number(pos) + 1;

        server.UpdateUserReadOnlyData(
		{
		    PlayFabId: currentPlayerId,
		    Data: { "RankLastSeason": pos }
		});
    }
    catch (err) {
        log.debug("err: " + err);
        return;
    }
}
//W CALL THIS FOR EACH USER
handlers.endSeasonUser = function (args, context) {
    var endSeasonData =
	{
	    "didClaim": true,
	    "scReceived": 0,
	    "hcReceived": 0,
	    "previousTrophies": 0,
	    "currentTrophies": 0
	};
    //let's get the end game variables
    var endGameData = server.GetTitleData(
	{
	    Keys: ["EndSezonObject", "SubdivisionTrophyRanges"]
	});
    try {
        var endGameDataParsed = JSON.parse(endGameData.Data.EndSezonObject);
        var trophyData = server.GetPlayerStatistics(
		{
		    PlayFabId: currentPlayerId,
		    StatisticNames: ["TrophyCount"]
		}).Statistics;
        var currentTrophies = Number(trophyData[0].Value);
        var arrTemp = JSON.parse(endGameData.Data.SubdivisionTrophyRanges).subdivisions;
        //var resetTrophiesValue = arrTemp[arrTemp.length - 1]; // code this properly later
        var resetTrophiesValue = 3001;
        var scToGive = Math.ceil(Number(endGameDataParsed.scConversionRate) * (currentTrophies - resetTrophiesValue));
        var hcToGive = Math.ceil(Number(endGameDataParsed.hcConversionRate) * (currentTrophies - resetTrophiesValue));
        endSeasonData =
		{
		    "didClaim": false,
		    "scReceived": scToGive,
		    "hcReceived": hcToGive,
		    "previousTrophies": currentTrophies,
		    "currentTrophies": resetTrophiesValue
		};

        server.UpdatePlayerStatistics(
		{
		    PlayFabId: currentPlayerId,
		    Statistics: [{ StatisticName: "TrophyCount", Value: resetTrophiesValue }]
		});

        if (scToGive > 0)
            server.AddUserVirtualCurrency(
			{
			    PlayFabId: currentPlayerId,
			    VirtualCurrency: "SC",
			    Amount: scToGive
			});
        if (hcToGive > 0)
            server.AddUserVirtualCurrency(
			{
			    PlayFabId: currentPlayerId,
			    VirtualCurrency: "HC",
			    Amount: hcToGive
			});
    }
    catch (err) {
        log.debug('err: ' + err);
        //return;
    }

    server.UpdateUserReadOnlyData(
	{
	    PlayFabId: currentPlayerId,
	    Data: { "EndSeasonReward": JSON.stringify(endSeasonData) }
	});
}

//sets claim status from EndSeasonReward to true
//if there exists an end season chest @ EndSeasonChest open it and send the data to the client

handlers.claimEndSeasonReward = function (args, context) {
    //let's see if the user was legend by checking for the existence of EndSeasonReward entry
    try {
        var userData = server.GetUserReadOnlyData(
		{
		    PlayFabId: currentPlayerId,
		    Keys: ["EndSeasonReward", "EndSeasonChest"]
		});
        if (userData.Data.EndSeasonReward == undefined) return generateFailObj("Nothing to claim");
        var updateObj = JSON.parse(userData.Data.EndSeasonReward.Value);
        updateObj.didClaim = true;
        server.UpdateUserReadOnlyData(
		{
		    PlayFabId: currentPlayerId,
		    Data: { "EndSeasonReward": JSON.stringify(updateObj) }
		})

        if (userData.Data.EndSeasonChest == undefined) return { Result: "OK", Message: "noChest" };
        var chestId = userData.Data.EndSeasonChest.Value;
        if (chestId == null) return { Result: "OK", Message: "noChest" };

        //looks like we have a chest. Let's get its data from the catalog
        var catalogData = server.GetCatalogItems({ CatalogVersion: "Chests" });

        var chestInfo;
        for (var i = 0; i < catalogData.Catalog.length; i++) {
            if (catalogData.Catalog[i].ItemId == chestId) {
                chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
                break;
            }
        }
        if (chestInfo == undefined) return generateErrObj("Could not find chest with id: " + chestId + " in the Chests catalog, or this chest's custom data is undefined");

        log.debug("generatung: " + chestId);
        var chestBounty = GenerateChestBounty(currentPlayerId, chestId, 7, chestInfo);

        var outInventory = server.GetUserInventory({ PlayFabId: currentPlayerId });

        server.UpdateUserReadOnlyData(
		{
		    PlayFabId: currentPlayerId,
		    Data: { "EndSeasonChest": null }
		});

        var returnObject = {
            Result: "OK",
            InventoryChange: outInventory,
            ChestBounty: chestBounty
        }
        return returnObject;
    }
    catch (err) {
        log.debug("err: " + err);
        return generateErrObj("something went wrong: " + err);
    }
}
/**
* Updates the amount of experience the user has based on given variables
* @param {string} catalogId the ID of the catalog holding xp data
* @param {string} itemId the id of the item holding xp data from the given catalog
* @param {string} xpArrayId the id of the object holding xp data from the give item
* @param {int} actionLevel the level of the exectued action (used to get the amount of xp to give)
* @param {bool} updateServer update experience to the server
* @param {int} playerStatistics array containing player experience, if not provided a GetPlayerStatistics will be done
*/
function UpdateExperience(catalogId, itemId, xpArrayId, actionLevel, updateServer, playerStatistics) {
    //the amount of xp gained at each action level
    var xpGainByLevel = JSON.parse(getCatalogItem(catalogId, itemId).CustomData)[xpArrayId];

    //xp cap to stop the user to level up past a given level
    var lvlThresholds = JSON.parse(getCatalogItem("Balancing", "BalancingItem").CustomData).LevelThresholds;
    var xpCap = lvlThresholds[lvlThresholds.length - 1];

    //get current exprience
    var ps = playerStatistics || server.GetPlayerStatistics({
        PlayFabId: currentPlayerId,
        StatisticNames: ["Experience"]
    }).Statistics;
    var currentExprience = GetValueFromStatistics(ps, "Experience", 0);

    if (currentExprience >= xpCap)
        return xpCap;

    var xpToReceive = 0;
    if (!isNaN(Number(xpGainByLevel))) {
        //action levels are represented by a single number value, the amount to give is xpGain
        xpToReceive = Number(xpGainByLevel);
        if (xpToReceive === 0) return currentExprience;
    }
    else {
        //action levels are represented by an object
        var ln = Number(xpGainByLevel.length);
        if (actionLevel >= ln) actionLevel = ln - 1;
        xpToReceive = Number(xpGainByLevel[actionLevel]);
    }

    //cap and update player's current experience
    currentExprience = Math.min(currentExprience + xpToReceive, xpCap);

    if (!updateServer) return currentExprience;
    var updateRequest = server.UpdatePlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        Statistics: [{ StatisticName: "Experience", Version: "0", Value: currentExprience }]
    });
    return currentExprience;
}
handlers.generateDaily = function (args, context) {
    var DailyStatus = 1; //0 <- waiting for daily timer, 1 <- generate daily, 2 <- daily is ongoing
    var DailyMissionClaimStatus = [0, 0, 0, 0, 0, 0, 0, 0];
    var d = new Date();

    var dStatus = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["DailyMissionStatus"]
	});

    if (dStatus.Data.DailyMissionStatus != undefined) {
        var parsedData = JSON.parse(dStatus.Data.DailyMissionStatus.Value);
        DailyStatus = Number(parsedData.DailyStatus);

        if (DailyStatus == 0) // we only check if status should be 1 from status 0
        {
            var tData = server.GetTitleData(
              {
                  PlayFabId: currentPlayerId,
                  Keys: ["DailyMissionData"]
              }
            );
            var totalMinutes = 600;
            tParsed = JSON.parse(tData.Data.DailyMissionData);
            totalMinutes = Number(tParsed.minutesToRefresh);

            var d = new Date();
            if (d.getTime() - Number(parsedData.timeStamp) > Number(totalMinutes) * 60 * 1000) // minutes *60*1000
            {
                DailyStatus = 1; // time's up we have to tell the client that it is time to generate a new daily
            }
        }

        if (DailyStatus != 1)
            return generateErrObj("DailyStatus is: " + DailyStatus + ". Should be 1");
    }

    DailyStatus = 2; //we are now in ongoing mode
    var timeStamp = d.getTime();
    var dailyObject =
	{
	    "DailyStatus": DailyStatus,
	    "dailyMissionClaimStatus": DailyMissionClaimStatus,
	    "timeStamp": timeStamp
	};
    var dailyObjectStringified = JSON.stringify(dailyObject);
    var objectToUpdate =
	{
	    "DailyMissionStatus": dailyObjectStringified
	}
    server.UpdateUserInternalData(
       {
           PlayFabId: currentPlayerId,
           Data: objectToUpdate
       });

    var r =
	{
	    "Result": "OK"
	};
    return r;
}
handlers.getChestSlotsStatus = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    //let's get the user's chest info
    var chestData = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["ChestFreeStatus", "ChestSlotsStatus"]
	});
    var chestSlotInfo;
    var freeChestSlotInfo;
    if (chestData.Data.ChestFreeStatus == undefined) {
        //let's get the catalog data for our chests
        var catalogData = server.GetCatalogItems(
		{
		    CatalogVersion: "Chests"
		});

        var freeChestInfo;

        for (var i = 0; i < catalogData.Catalog.length; i++) {
            if (catalogData.Catalog[i].ItemId == "FreeChest") {
                freeChestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
                break;
            }
        }

        if (freeChestInfo == undefined) return generateErrObj("Chest catalog has no freechestinfo");

        var freeOpenTime = Number(freeChestInfo.hoursToOpen.split(",")[0]); // we init with first value
        if (isNaN(freeOpenTime)) return generateErrObj("FreeChest open time info is invalid");

        var d = new Date();
        var currentTimeStampSeconds = Math.floor(Number(d.getTime()) / 1000);
        var timeStampOfNextFreeChestArrival = Math.floor(currentTimeStampSeconds + freeOpenTime * 60 * 60);

        freeChestSlotInfo = [{ "status": 0, "TimeUntilArrival": timeStampOfNextFreeChestArrival }, { "status": 1, "TimeUntilArrival": 0 }];

        var freeChestSlotInfoString = JSON.stringify(freeChestSlotInfo);
        server.UpdateUserInternalData(
		{
		    PlayFabId: currentPlayerId,
		    Data:
			{
			    "ChestFreeStatus": freeChestSlotInfoString
			}
		});
        freeChestSlotInfo = freeChestSlotInfoString;
    }
    else {
        freeChestSlotInfo = chestData.Data.ChestFreeStatus.Value;
    }

    if (chestData.Data.ChestSlotsStatus == undefined) {
        chestSlotInfo = [
						  {
						      "chestId": null,
						      "chestLeague": 0,
						      "status": "Empty",
						      "orderTimeStamp": 0,
						      "arrivalTimeStamp": 0
						  },
						  {
						      "chestId": null,
						      "chestLeague": 0,
						      "status": "Empty",
						      "orderTimeStamp": 0,
						      "arrivalTimeStamp": 0
						  },
						  {
						      "chestId": null,
						      "chestLeague": 0,
						      "status": "Empty",
						      "orderTimeStamp": 0,
						      "arrivalTimeStamp": 0
						  },
						  {
						      "chestId": null,
						      "chestLeague": 0,
						      "status": "Empty",
						      "orderTimeStamp": 0,
						      "arrivalTimeStamp": 0
						  }
        ];

        //let's give older users some starting chests. already ready to open. We'll determine these users as being those who have the ChestsOpen statistic higher than let's say 15
        //get ChestsOpen stat
        var ms = server.GetPlayerStatistics(
		  {
		      PlayFabId: currentPlayerId,
		      StatisticNames: ["ChestsOpened", "TrophyCount"]
		  }).Statistics;
        var chestsOpened = GetValueFromStatistics(ms, "ChestsOpened", 0);
        var trophies = GetValueFromStatistics(ms, "TrophyCount", 0);
        var cLeague = calculateLeague(trophies);
        if (Number(chestsOpened) > 15) {
            chestSlotInfo[0].chestId = "GoldChest";
            chestSlotInfo[0].chestLeague = cLeague;
            chestSlotInfo[0].status = "Arrived";
            chestSlotInfo[0].arrivalTimeStamp = 0;
            chestSlotInfo[0].orderTimeStamp = 1;
        }

        var chestSlotInfoString = JSON.stringify(chestSlotInfo);
        server.UpdateUserInternalData(
		{
		    PlayFabId: currentPlayerId,
		    Data:
			{
			    "ChestSlotsStatus": chestSlotInfoString
			}
		});
        chestSlotInfo = chestSlotInfoString;
    }
    else {
        chestSlotInfo = chestData.Data.ChestSlotsStatus.Value;
    }

    var r = {
        "Result": "OK",
        "ChestSlotInfo": JSON.parse(chestSlotInfo),
        "FreeSlotsInfo": JSON.parse(freeChestSlotInfo)
    }
    return r;
}
handlers.getDailyMissionStatus = function (args, context) {

    //var mC = CheckMaintenanceAndVersion(args);
    //if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    var DailyStatus = 2; //0 <- waiting for daily timer, 1 <- generate daily, 2 <- daily is ongoing
    var DailyMissionClaimStatus = [0, 0, 0, 0, 0, 0, 0, 0];
    var TimeRemaining = -1;
    var dStatus = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["DailyMissionStatus"]
	});

    if (dStatus.Data.DailyMissionStatus != undefined) {
        var parsedData = JSON.parse(dStatus.Data.DailyMissionStatus.Value);
        DailyStatus = Number(parsedData.DailyStatus);
        var tempLength = DailyMissionClaimStatus.length;
        if (tempLength > parsedData.dailyMissionClaimStatus.length) tempLength = parsedData.dailyMissionClaimStatus.length;
        for (var i = 0; i < tempLength; i++) {
            DailyMissionClaimStatus[i] = parsedData.dailyMissionClaimStatus[i];
        }

        if (DailyStatus == 0) // we only return remaining time till next quest if status is waiting for daily timer
        {
            var tData = server.GetTitleData(
              {
                  PlayFabId: currentPlayerId,
                  Keys: ["DailyMissionData"]
              }
            );
            var totalMinutes = 600;
            tParsed = JSON.parse(tData.Data.DailyMissionData);
            totalMinutes = Number(tParsed.minutesToRefresh);

            var d = new Date();
            if (d.getTime() - Number(parsedData.timeStamp) > Number(totalMinutes) * 60 * 1000) // minutes *60*1000
            {
                DailyStatus = 2; // time's up we have to  generate a new daily
                DailyMissionClaimStatus = [0, 0, 0, 0, 0, 0, 0, 0];
                var timeStamp = d.getTime();

                var dailyObject =
                {
                    "DailyStatus": DailyStatus,
                    "dailyMissionClaimStatus": DailyMissionClaimStatus,
                    "timeStamp": timeStamp
                };
                var dailyObjectStringified = JSON.stringify(dailyObject);
                var objectToUpdate =
                {
                    "DailyMissionStatus": dailyObjectStringified
                }
                server.UpdateUserInternalData(
                   {
                       PlayFabId: currentPlayerId,
                       Data: objectToUpdate
                   });
            }
            else {
                TimeRemaining = (Number(totalMinutes) * 60) - (Math.floor((d.getTime() - Number(parsedData.timeStamp)) / 1000)); // time remaining till next quest in seconds
            }
        }
    }
    else {
        DailyStatus = 2; //we are now in ongoing mode
        var d = new Date();
        var timeStamp = d.getTime();
        var dailyObject =
		{
		    "DailyStatus": DailyStatus,
		    "dailyMissionClaimStatus": DailyMissionClaimStatus,
		    "timeStamp": timeStamp
		};
        var dailyObjectStringified = JSON.stringify(dailyObject);
        var objectToUpdate =
		{
		    "DailyMissionStatus": dailyObjectStringified
		}
        server.UpdateUserInternalData(
	       {
	           PlayFabId: currentPlayerId,
	           Data: objectToUpdate
	       });
    }
    var dStObj =
	{
	    status: DailyStatus,
	    claimStatus: DailyMissionClaimStatus,
	    timeRemaining: TimeRemaining
	};
    var r =
	{
	    "Result": "OK",
	    "Message": " ",
	    "DailyStatus": dStObj
	};
    return r;
}
handlers.getLiveFeed = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    //give live feed as object
    var titleData = server.GetTitleInternalData(
    {
        Keys: "LiveFeed"
    }
    );
    if (titleData == undefined) return generateErrObj("No LivefeedFound");
    if (titleData.Data["LiveFeed"] == undefined) return generateErrObj("No LivefeedFound");
    var parsedData = JSON.parse(titleData.Data["LiveFeed"]);
    var r =
    {
        Result: "OK",
        Feed: parsedData
    }
    return r;
}
handlers.getServerTime = function (args, context) {
    var t = new Date();
    return { time: t };
}
handlers.iapMade = function (args, context) {
    //this code will fire whenever a IAP is succesfully validated
    var ps = server.GetPlayerStatistics(
  	{
  	    PlayFabId: currentPlayerId,
  	    StatisticNames: ["IAPValue"]
  	}).Statistics;

    var iapVal = Number(GetValueFromStatistics(ps, "IAPValue", 0));

    //BMBundleInfo

    switch (args.bundle) {
        case "co.tamatem.downshiftdrift.gold01":
            iapVal += 99;
            break;
        case "co.tamatem.downshiftdrift.gold02":
            iapVal += 499;
            break;
        case "co.tamatem.downshiftdrift.gold03":
            iapVal += 2499;
            break;
        case "co.tamatem.downshiftdrift.gold04":
            iapVal += 2499;
            break;
        case "co.tamatem.downshiftdrift.gold05":
            iapVal += 4999;
            break;
        case "co.tamatem.downshiftdrift.gold06":
            iapVal += 9999;
            break;
        case "co.tamatem.downshiftdrift.bundle01":
            iapVal += 599;

            var userInventoryObject = server.GetUserInventory(
            {
                PlayFabId: currentPlayerId,
            }
            );

            var custCatalog = server.GetCatalogItems(
            {
                CatalogVersion: "BMBundleInfo"
            });
            var ps = server.GetPlayerStatistics(
            {
                PlayFabId: currentPlayerId,
                StatisticNames: ["HighestLeagueReached"]
            }).Statistics;

            var hlr = Number(GetValueFromStatistics(ps, "HighestLeagueReached", 1));
            var bundleName = "bundle01league";
            if (hlr < 10) bundleName = bundleName + "0" + hlr;
            else bundleName += hlr;
            if (args.debug == true) log.debug("consuming: " + bundleName);


            var bundleInfo;
            for (var i = 0; i < custCatalog.Catalog.length; i++) {
                if (custCatalog.Catalog[i].ItemId == bundleName) {
                    bundleInfo = JSON.parse(custCatalog.Catalog[i].CustomData)
                    break;
                }
            }

            if (bundleInfo == undefined) return generateErrObj("Catalog item: " + bundleName + " not found");
            for (var i = 0; i < userInventoryObject.Inventory.length; i++) {
                if (userInventoryObject.Inventory[i].ItemId == args.bundle) {
                    //consume item
                    try {
                        var cons = server.ConsumeItem(
                        {
                            PlayFabId: currentPlayerId,
                            ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
                            ConsumeCount: 1
                        });
                    }
                    catch (err) {
                        return generateErrObj("err: " + err);
                    }
                    //check if consumption was succesfull

                    //prepare object to send to client for inventory refresh purposes
                    var invData;
                    var objectsUpdated = [];
                    var currencyUpdated = {};
                    //we now have to parse the bundleinfo to get it's contents
                    //HC
                    if (bundleInfo.HCRange != undefined) {
                        if (args.debug == true) log.debug("found HCRange: " + bundleInfo.HCRange);
                        var splitInfo = bundleInfo.HCRange.split(",");
                        var hcAmount = 1;
                        if (splitInfo.length >= 2) {
                            if (Number(splitInfo[0]) < Number(splitInfo[1])) {
                                hcAmount = Number(splitInfo[0]) + Math.floor(Math.random() * (Number(splitInfo[1]) - Number(splitInfo[0])));
                            }
                            else {
                                hcAmount = Number(splitInfo[0]);
                            }
                        }
                        else {
                            return generateErrObj("Catalog data corrupt");
                        }

                        if (hcAmount > 0) {
                            addUserCurrencyResult = server.AddUserVirtualCurrency(
                              {
                                  PlayFabId: currentPlayerId,
                                  VirtualCurrency: "HC",
                                  Amount: hcAmount
                              }
                            );

                            currencyUpdated[addUserCurrencyResult.VirtualCurrency] = addUserCurrencyResult.Balance;
                        }
                    }

                    //SC
                    if (bundleInfo.SCRange != undefined) {
                        if (args.debug == true) log.debug("found SCRange: " + bundleInfo.SCRange);

                        var splitInfo = bundleInfo.SCRange.split(",");
                        var scAmount = 1;
                        if (splitInfo.length >= 2) {
                            if (Number(splitInfo[0]) < Number(splitInfo[1])) {
                                scAmount = Number(splitInfo[0]) + Math.floor(Math.random() * (Number(splitInfo[1]) - Number(splitInfo[0])));
                            }
                            else {
                                scAmount = Number(splitInfo[0]);
                            }
                        }
                        else {
                            return generateErrObj("Catalog data corrupt");
                        }

                        if (scAmount > 0) {
                            addUserCurrencyResult = server.AddUserVirtualCurrency(
                              {
                                  PlayFabId: currentPlayerId,
                                  VirtualCurrency: "SC",
                                  Amount: scAmount
                              }
                            );
                            currencyUpdated[addUserCurrencyResult.VirtualCurrency] = addUserCurrencyResult.Balance;
                        }
                    }

                    //Engine
                    if (bundleInfo.Engine != undefined) {
                        if (args.debug == true) log.debug("found Engine: " + bundleInfo.Engine);
                        var splitInfo = bundleInfo.Engine.split(",");
                        if (splitInfo.length >= 2) {
                            var res = GiveUserPart("Engine", splitInfo[0], splitInfo[1], userInventoryObject);
                            objectsUpdated.push(res);
                        }
                        else
                            return generateErrObj("Catalog data corrupt");
                    }

                    //Exhaust
                    if (bundleInfo.Exhaust != undefined) {
                        if (args.debug == true) log.debug("found Exhaust: " + bundleInfo.Exhaust);
                        var splitInfo = bundleInfo.Exhaust.split(",");
                        if (splitInfo.length >= 2) {
                            var res = GiveUserPart("Exhaust", splitInfo[0], splitInfo[1], userInventoryObject);
                            objectsUpdated.push(res);
                        }
                        else
                            return generateErrObj("Catalog data corrupt");
                    }

                    //Gearbox
                    if (bundleInfo.Gearbox != undefined) {
                        if (args.debug == true) log.debug("found Gearbox: " + bundleInfo.Gearbox);
                        var splitInfo = bundleInfo.Gearbox.split(",");
                        if (splitInfo.length >= 2) {
                            var res = GiveUserPart("Gearbox", splitInfo[0], splitInfo[1], userInventoryObject);
                            objectsUpdated.push(res);
                        }
                        else
                            return generateErrObj("Catalog data corrupt");
                    }

                    //Suspension
                    if (bundleInfo.Suspension != undefined) {
                        if (args.debug == true) log.debug("found Suspension: " + bundleInfo.Suspension);
                        var splitInfo = bundleInfo.Suspension.split(",");
                        if (splitInfo.length >= 2) {
                            var res = GiveUserPart("Suspension", splitInfo[0], splitInfo[1], userInventoryObject);
                            objectsUpdated.push(res);
                        }
                        else
                            return generateErrObj("Catalog data corrupt");
                    }

                    //Tires
                    if (bundleInfo.Tires != undefined) {
                        if (args.debug == true) log.debug("found Tires: " + bundleInfo.Tires);
                        var splitInfo = bundleInfo.Tires.split(",");
                        if (splitInfo.length >= 2) {
                            var res = GiveUserPart("Tires", splitInfo[0], splitInfo[1], userInventoryObject);
                            objectsUpdated.push(res);
                        }
                        else
                            return generateErrObj("Catalog data corrupt");
                    }

                    //Turbo
                    if (bundleInfo.Turbo != undefined) {
                        if (args.debug == true) log.debug("found Turbo: " + bundleInfo.Turbo);
                        var splitInfo = bundleInfo.Turbo.split(",");
                        if (splitInfo.length >= 2) {
                            var res = GiveUserPart("Turbo", splitInfo[0], splitInfo[1], userInventoryObject);
                            objectsUpdated.push(res);
                        }
                        else
                            return generateErrObj("Catalog data corrupt");
                    }

                    //CarCard
                    if (bundleInfo.CarCard != undefined) {
                        if (args.debug == true) log.debug("found CarCard: " + bundleInfo.CarCard);

                        //CarCardAmount
                        if (bundleInfo.CarCardAmount != undefined) {
                            if (args.debug == true) log.debug("found CarCardAmount: " + bundleInfo.CarCardAmount);

                            var splitInfo = bundleInfo.CarCardAmount.split(",");
                            if (splitInfo.length >= 2) {
                                var res = GiveUserCarCard(bundleInfo.CarCard, splitInfo[0], splitInfo[1], userInventoryObject);
                                objectsUpdated.push(res);
                            }
                            else
                                return generateErrObj("Catalog data corrupt");

                        }
                    }
                    var chestModel = "DiamondChest";
                    //ChestModel
                    if (bundleInfo.ChestModel != undefined) {
                        if (args.debug == true) log.debug("found ChestModel: " + bundleInfo.ChestModel);
                        chestModel = bundleInfo.ChestModel;
                    }
                }
            }

            var suArray = [];
            var su = { StatisticName: "IAPValue", Value: iapVal };
            suArray.push(su);

            var updateRequest = server.UpdatePlayerStatistics(
              {
                  PlayFabId: currentPlayerId,
                  Statistics: suArray
              }
              );
            invData =
            {
                Inventory: objectsUpdated,
                VirtualCurrency: currencyUpdated
            };
            var returnObj = {
                Result: "OK",
                Message: "InventoryUpdate",
                InventoryChange: invData
            };

            return returnObj;

            break;
        default:
            if (args.debug == true) log.debug("InvalidPurchaseParameter");
            break;
    }

    var suArray = [];
    var su = { StatisticName: "IAPValue", Value: iapVal };
    suArray.push(su);

    var updateRequest = server.UpdatePlayerStatistics(
	  {
	      PlayFabId: currentPlayerId,
	      Statistics: suArray
	  }
	  );

    publishToLiveFeed(currentPlayerId, "boughtIAP", args.bundle);
}
handlers.initServerData = function (args) {
    //create trophy statistic
    var suArray = [];

    var su = { StatisticName: "TrophyCount", Version: "0", Value: "0" };
    suArray.push(su);
    su = { StatisticName: "League", Version: "0", Value: "0" };
    suArray.push(su);

    var updateRequest = server.UpdatePlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        Statistics: suArray
    }
    );
    var itemsToGive = ["Decals", "PaintJobs", "Plates", "Rims", "WindshieldText"];
    //itemsToGive.push("Decals");
    //itemsToGive.push("PaintJobs");
    //itemsToGive.push("Plates");
    //itemsToGive.push("Rims");
    //itemsToGive.push("WindshieldText");

    var grantRequest = server.GrantItemsToUser(
      {
          CatalogVersion: "Customization",
          PlayFabId: currentPlayerId,
          ItemIds: itemsToGive
      }
      );

    var InvData = { "0": "Owned" };

    for (var i = 0; i < grantRequest.ItemGrantResults.length; i++) {
        server.UpdateUserInventoryItemCustomData(
             {
                 PlayFabId: currentPlayerId,
                 ItemInstanceId: grantRequest.ItemGrantResults[i].ItemInstanceId,
                 Data: InvData
             }
             );
    }
    var carsToGive = [];
    carsToGive.push("FordFocus");
    var carRequest = server.GrantItemsToUser(
    {
        CatalogVersion: "CarsProgress",
        PlayFabId: currentPlayerId,
        ItemIds: carsToGive
    }
    );
    var CarData = { "CarLvl": "1", "EngineLvl": "0", "ExhaustLvl": "0", "GearboxLvl": "0", "SuspensionLvl": "0" };
    server.UpdateUserInventoryItemCustomData(
    {
        PlayFabId: currentPlayerId,
        ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
        Data: CarData
    }
    );
    CarData = { "TiresLvl": "0", "TurboLvl": "0", "PaintId": "0", "DecalId": "0", "RimsId": "0" };
    server.UpdateUserInventoryItemCustomData(
    {
        PlayFabId: currentPlayerId,
        ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
        Data: CarData
    }
    );
    CarData = { "PlatesId": "0", "WindshieldId": "0", "Pr": "10" };
    server.UpdateUserInventoryItemCustomData(
    {
        PlayFabId: currentPlayerId,
        ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
        Data: CarData
    }
    );

    var partsToGive = [];
    partsToGive.push("Engine");
    var partRequest = server.GrantItemsToUser(
    {
        CatalogVersion: "PartCards",
        PlayFabId: currentPlayerId,
        ItemIds: partsToGive
    }
    );
    var PartData = { "Amount": "5" };
    server.UpdateUserInventoryItemCustomData(
    {
        PlayFabId: currentPlayerId,
        ItemInstanceId: partRequest.ItemGrantResults[0].ItemInstanceId,
        Data: PartData
    }
    );
    CarData = { "CarLvl": "1", "EngineLvl": "0", "ExhaustLvl": "0", "GearboxLvl": "0", "SuspensionLvl": "0" };
    server.UpdateUserInventoryItemCustomData(
    {
        PlayFabId: currentPlayerId,
        ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
        Data: CarData
    });
};
handlers.levelUp = function (args, context) {
    var newLevel = args.level; //user's new level according to client

    var lastLvlReward = 0;
    var lastRewardLevel = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["LastLevelReward"]
    });
    var levelItemDataToUpdate = {};
    levelItemDataToUpdate["LastLevelReward"] = 0;
    if (lastRewardLevel.Data.LastLevelReward == undefined) {
        server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: levelItemDataToUpdate
        }
          );
    }
    else {
        lastLvlReward = lastRewardLevel.Data.LastLevelReward.Value;
    }

    // now let's see if the user gets a reward
    var lvlThresholds = JSON.parse(getCatalogItem("Balancing", "BalancingItem").CustomData).LevelThresholds;
    //get current exprience
    var ps = server.GetPlayerStatistics(
     {
         PlayFabId: currentPlayerId,
         StatisticNames: ["Experience"]
     }).Statistics;
    var currentExprience = GetValueFromStatistics(ps, "Experience", 0);
    if (currentExprience == 0) // this most likely means that the user doesn't have the exp statistic so let's give it to them
    {
        var suArray = [];
        var su = { StatisticName: "Experience", Version: "0", Value: 0 };
        suArray.push(su);

        server.UpdatePlayerStatistics(
        {
            PlayFabId: currentPlayerId,
            Statistics: suArray
        });
    }
    var currLvl = lvlThresholds.length; // user's level according to server
    for (var i = 0; i < lvlThresholds.length; i++) {
        if (currentExprience >= lvlThresholds[i]) continue;
        currLvl = i; break;
    }

    if (Number(newLevel) <= Number(lastLvlReward)) return generateFailObj("already got reward for level: " + lastLvlReward);

    if (Number(newLevel) <= Number(currLvl)) {
        lastLvlReward = Number(newLevel);
        levelItemDataToUpdate["LastLevelReward"] = lastLvlReward;
        server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: levelItemDataToUpdate
        }
          );
        //give bundle to user
        //ids of bundles are of the form 001, 002, ... , 012 etc so padded with 0s until it has 3 digits
        var str = "" + lastLvlReward;
        var pad = "000";
        var ans = pad.substring(0, pad.length - str.length) + str;
        server.GrantItemsToUser(
        {
            CatalogVersion: "LevelUpRewards",
            PlayFabId: currentPlayerId,
            ItemIds: ans
        }
          );
        //let's publish to the feed that the user leveled up
        if (Number(currLvl) > 2)
            publishToLiveFeed(currentPlayerId, "levelUp", Number(currLvl));
    }
    else return generateFailObj("You haven't reached this level yet");

    var outInventory = server.GetUserInventory({ PlayFabId: currentPlayerId });
    return generateInventoryChange("InventoryUpdated", outInventory);
}
handlers.openChest = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    var objectsUpdated = [];
    var currencyUpdated = [];
    var invChangeObj;
    var userInventoryObject = server.GetUserInventory(
      {
          PlayFabId: currentPlayerId
      }
    );

    //currency
    var addUserCurrencyResult;
    for (var p in args.currencyReq) {
        if (args.currencyReq[p] > 0)
            addUserCurrencyResult = server.AddUserVirtualCurrency(
              {
                  PlayFabId: currentPlayerId,
                  VirtualCurrency: p,
                  Amount: args.currencyReq[p]
              }
            );

    }

    var outInventory = server.GetUserInventory({ PlayFabId: currentPlayerId });

    return generateInventoryChange("InventoryUpdated", outInventory);
};
handlers.openFreeChest = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);
    //let's get the user's slots chest info
    var chestData = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["ChestFreeStatus"]
	});
    //check user free slots data validity.
    if (chestData.Data.ChestFreeStatus == undefined) return generateErrObj("No Chest Data found!");

    var slotArray = JSON.parse(chestData.Data.ChestFreeStatus.Value);
    var slotFound = -1;
    for (var i = slotArray.length - 1; i >= 0; i--) {
        if ((slotArray[i].status == 1) || (Number(slotArray[i].TimeUntilArrival) <= Math.floor((new Date().getTime() / 1000)))) {
            log.debug("we found a free chest");
            slotFound = i;
            break;
        }
    }

    if (slotFound == -1) return generateFailObjCustom("FreeSlotsInfo", JSON.parse(chestData.Data.ChestFreeStatus.Value)); // we found no empty slot. The client must be desynced with the server. Let's update it

    //let's figure out the user's league
    var tc = server.GetPlayerStatistics(
	  {
	      PlayFabId: currentPlayerId,
	      StatisticNames: ["TrophyCount"]
	  });
    var trophyCount = 0;
    if (tc.Statistics.length != 0) {
        trophyCount = tc.Statistics[0].Value;
    }
    trophyCount = Number(trophyCount);
    var cLeague = Number(calculateLeague(trophyCount));

    //let's get the catalog data for chests
    var catalogData = server.GetCatalogItems({ CatalogVersion: "Chests" });

    //let's get the chestInfo for freeChest
    var chestInfo;
    for (var i = 0; i < catalogData.Catalog.length; i++) {
        if (catalogData.Catalog[i].ItemId == "FreeChest") {
            chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
            break;
        }
    }
    if (chestInfo == undefined) return generateErrObj("Could not find chest with id: " + "FreeChest" + " in the Chests catalog, or this chest's custom data is undefined");

    //let's update the free slot info
    var freeOpenTime = Number(chestInfo.hoursToOpen.split(",")[0]); // we init with first value
    if (isNaN(freeOpenTime)) return generateErrObj("FreeChest open time info is invalid");

    var d = new Date();
    var currentTimeStampSeconds = Math.floor(Number(d.getTime()) / 1000);

    var tempMax = currentTimeStampSeconds;
    for (var i = 0; i < slotArray.length; i++) {
        if (tempMax < slotArray[i].TimeUntilArrival)
            tempMax = slotArray[i].TimeUntilArrival;
    }

    var timeStampOfNextFreeChestArrival = Math.floor(tempMax + freeOpenTime * 60 * 60);

    slotArray[slotFound].status = 0;
    slotArray[slotFound].TimeUntilArrival = timeStampOfNextFreeChestArrival;

    var freeChestSlotInfoString = JSON.stringify(slotArray);
    server.UpdateUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Data:
		{
		    "ChestFreeStatus": freeChestSlotInfoString
		}
	});

    var chestBounty = GenerateChestBounty(currentPlayerId, "FreeChest", cLeague, chestInfo);

    //let's get the new user inventory
    var outInventory = server.GetUserInventory({ PlayFabId: currentPlayerId });
    var returnObject =
	{
	    Result: "OK",
	    ChestBounty: chestBounty,
	    FreeSlotsInfo: slotArray,
	    InventoryChange: outInventory
	}

    return returnObject;
}
handlers.purchaseBMItem = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    //log.debug("purchasing item " + args.itemId + " from black market");
    if ((args.itemId < 0) || (args.itemId > 3)) return generateFailObj("invalid item index");
    var keysToGet = [];
    keysToGet.push("BMItem" + args.itemId);

    var getInternalDataResult = server.GetUserInternalData(
    {
        PlayFabId: currentPlayerId,
        Keys: keysToGet
    }
    );

    var userInventoryObject = server.GetUserInventory(
    {
        PlayFabId: currentPlayerId
    }
    );

    var userArray = getInternalDataResult.Data["BMItem" + args.itemId].Value.split("_");//name, curr, baseCost, uses, costUse
    //log.debug("userArray: " + userArray);
    var playerMoney = userInventoryObject.VirtualCurrency[userArray[1]];

    if (userArray.length != 5) {
        generateErrObj("User Black Market corrupted. Try again tomorrow");
    }

    var catalogName = "";
    if (args.itemId < 2)
        catalogName = "PartCards";
    else
        catalogName = "CarCards";

    var price = parseInt(userArray[2]) + parseInt(userArray[3]) * parseInt(userArray[4]);
    var checkObj = checkBalance(userArray[1], price, playerMoney, playerMoney);
    if (checkObj != "OK") return checkObj;
    //try
    //{
    var cardInstance;
    var cardAmount = 0;
    var cardData;
    // log.debug("searching for: " + userArray[0] + " in " + catalogName);
    for (var i = 0; i < userInventoryObject.Inventory.length; i++) // if we find it in the inventory we just give him the amount of cards we owe the player
    {
        if ((userInventoryObject.Inventory[i].ItemId == userArray[0]) && (userInventoryObject.Inventory[i].CatalogVersion == catalogName)) {
            // log.debug("found it!");
            cardInstance = userInventoryObject.Inventory[i].ItemInstanceId;
            if (userInventoryObject.Inventory[i].CustomData === undefined) {
                // log.debug("no custom data. creating ...");
                cardData = { "Amount": 1 };
            }
            else {
                if (userInventoryObject.Inventory[i].CustomData.Amount === undefined)
                    cardData = { "Amount": 1 };
                else {
                    var tempAmount = Number(userInventoryObject.Inventory[i].CustomData.Amount) + 1;
                    if (isNaN(tempAmount)) tempAmount = 1;
                    cardData = { "Amount": tempAmount };
                }
            }

            server.UpdateUserInventoryItemCustomData(
                  {
                      PlayFabId: currentPlayerId,
                      ItemInstanceId: cardInstance,
                      Data: cardData
                  }
                  );

            break;
        }
    }
    if (cardInstance === undefined) {
        //log.debug("cardInstance is undefined");
        var itemsToGive = [];
        itemsToGive.push(userArray[0]);
        var grantRequest = server.GrantItemsToUser(
          {
              CatalogVersion: catalogName,
              PlayFabId: currentPlayerId,
              ItemIds: itemsToGive
          }
          );
        cardInstance = grantRequest.ItemGrantResults[0].ItemInstanceId;
        if (cardInstance === undefined)
            generateErrObj("grantRequest denied");
        else {
            cardData = { "Amount": 1 };
            server.UpdateUserInventoryItemCustomData(
              {
                  PlayFabId: currentPlayerId,
                  ItemInstanceId: cardInstance,
                  Data: cardData
              }
              );
        }
    }
    var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
      {
          PlayFabId: currentPlayerId,
          VirtualCurrency: userArray[1],
          Amount: price
      }
      );
    updateCurrencySpentStatistic(userArray[1], price);
    var itemVal = userArray[0] + "_" + userArray[1] + "_" + userArray[2] + "_" + (parseInt(userArray[3]) + 1) + "_" + userArray[4];
    //log.debug("generatedArray: " + itemVal);
    var dataToUpdate = {};
    dataToUpdate["BMItem" + args.itemId] = itemVal;
    server.UpdateUserInternalData(
      {
          PlayFabId: currentPlayerId,
          Data: dataToUpdate
      });
    var objectsUpdated =
        [
        {
            ItemId: userArray[0],
            CatalogVersion: catalogName,
            CustomData: cardData
        }
        ];

    var currencyUpdated = {};
    currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
    var b = args.itemId + "_" + userArray[2] + "_" + (parseInt(userArray[3]) + 1) + "_" + userArray[4];
    i = {
        Inventory: objectsUpdated,
        VirtualCurrency: currencyUpdated
    };
    var returnObj = {
        Result: "OK",
        Message: "InventoryUpdate",
        InventoryChange: i,
        BMItemChange: b
    };
    return returnObj;
};
handlers.purchaseItems = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);
    //retrieve user inventory
    //log.debug("RETRIEVING USER INVENTORY");
    var userInventoryObject = server.GetUserInventory(
      {
          PlayFabId: currentPlayerId
      }
    );
    //retrieve player currency
    var playerSC = userInventoryObject.VirtualCurrency.SC;
    var playerHC = userInventoryObject.VirtualCurrency.HC;

    //log.debug("user currency: SC: " + playerSC + " HC: " + playerHC);

    switch (args.purchaseType) {
        case "carUpgrade":
            return upgradeCar(args, context, userInventoryObject, playerSC, playerHC);

        case "partUpgrade":
            return upgradePart(args, context, userInventoryObject, playerSC, playerHC);

        case "custPurchase":
            // log.debug("Purchasing Customization: " + args.custId + " with val: " + args.custVal);
            var custCatalog = server.GetCatalogItems(
              {
                  CatalogVersion: "Customization"
              }
            );

            var custCatalogItem;
            var custPrice = 0;
            var custCurr = "SC";
            for (var i = 0; i < custCatalog.Catalog.length; i++) {
                if (custCatalog.Catalog[i].ItemId == args.custId) {
                    custCatalogItem = custCatalog.Catalog[i];
                    cardInfo = JSON.parse(custCatalog.Catalog[i].CustomData)
                    var keyRequestCurr = args.custVal + ",Curr";
                    var keyRequestCost = args.custVal + ",Cost";

                    custCurr = cardInfo[keyRequestCurr];
                    custPrice = cardInfo[keyRequestCost];

                    var costCheckObj = checkBalance(custCurr, custPrice, playerSC, playerHC);
                    if (costCheckObj != "OK") return costCheckObj;

                    // log.debug("custCurr: " + custCurr);
                    //   log.debug("custPrice: " + custPrice);

                    break;
                }
            }

            if (custCatalogItem == undefined)
                return generateErrObj("Customization does not exist in catalog.");

            //  log.debug("Checking to see if user has said customization");
            var customizationItem;
            var customizationItemInstance;
            for (var i = 0; i < userInventoryObject.Inventory.length; i++) {
                if (userInventoryObject.Inventory[i].ItemId == args.custId) {
                    //       log.debug("user has customization category!");
                    customizationItem = userInventoryObject.Inventory[i];
                    customizationItemInstance = userInventoryObject.Inventory[i].ItemInstanceId;
                    if (customizationItem.CustomData != undefined) {
                        if (String(args.custVal) in customizationItem.CustomData) {
                            return generateFailObj("User already has this customization.");
                        }
                    }
                    break;
                }
            }

            if (customizationItem == undefined) {
                log.info("user doesn't have customization category. Granting ... ");
                var itemsToGive = [];
                itemsToGive.push(args.custId);

                var custToGive = server.GrantItemsToUser(
                  {
                      CatalogVersion: "Customization",
                      PlayFabId: currentPlayerId,
                      ItemIds: itemsToGive
                  }
                );

                if (custToGive.ItemGrantResults[0].Result == false)
                    return generateErrObj("something went wrong while granting user customization class object.");

                customizationItemInstance = custToGive.ItemGrantResults[0].ItemInstanceId;
            }

            var customizationData = {};
            customizationData[String(args.custVal)] = "Owned";

            server.UpdateUserInventoryItemCustomData(
              {
                  PlayFabId: currentPlayerId,
                  ItemInstanceId: customizationItemInstance,
                  Data: customizationData
              }
            );
            var i;
            var objectsUpdated =
            [
              {
                  ItemId: args.custId,
                  CatalogVersion: "Customization",
                  CustomData: customizationData
              }
            ];

            if (custPrice > 0) {
                var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
                  {
                      PlayFabId: currentPlayerId,
                      VirtualCurrency: custCurr,
                      Amount: custPrice
                  }
                );
                updateCurrencySpentStatistic(custCurr, custPrice);
                var currencyUpdated = {};
                currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
                i =
                {
                    Inventory: objectsUpdated,
                    VirtualCurrency: currencyUpdated
                };
            }
            else {
                i =
                {
                    Inventory: objectsUpdated
                };
            }
            return generateInventoryChange("InventoryUpdateNewCustomization", i)

            break; // big switch
        case "softCurrencyPurchase":
            //   log.debug("Purchasing pack: " + args.packId);

            //   log.debug("Checking to see if pack exists in catalog");
            var packCatalog = server.GetCatalogItems(
              {
                  CatalogVersion: "SoftCurrencyStore"
              }
            );

            var packExists = false;
            var packPrice = 0;
            for (var i = 0; i < packCatalog.Catalog.length; i++) {
                if (packCatalog.Catalog[i].ItemId == args.packId) {
                    packPrice = packCatalog.Catalog[i].VirtualCurrencyPrices.HC;
                    cardInfo = JSON.parse(packCatalog.Catalog[i].CustomData);
                    packExists = true;
                    break;
                }
            }

            if (packExists == false)
                return generateErrObj("pack with ID: " + args.packId + " not found in catalog.");

            if (packPrice <= 0)
                return generateErrObj("pack with ID: " + args.packId + " shouldn't have negative cost.");

            if (packPrice > playerHC)
                return generateFailObj("Not enough HC.");

            var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
              {
                  PlayFabId: currentPlayerId,
                  VirtualCurrency: "HC",
                  Amount: packPrice
              }
            );
            updateCurrencySpentStatistic("HC", packPrice);
            var addUserCurrencyResult = server.AddUserVirtualCurrency(
              {
                  PlayFabId: currentPlayerId,
                  VirtualCurrency: "SC",
                  Amount: cardInfo.quantity
              }
            );
            var currencyUpdated = {};
            currencyUpdated[addUserCurrencyResult.VirtualCurrency] = addUserCurrencyResult.Balance;
            currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
            var invChangeObj =
            {
                VirtualCurrency: currencyUpdated
            };
            return generateInventoryChange("SoftCurrencyPurchased", invChangeObj)
            break;

        default:
            log.debug("invalid purchase parameter");
    }
};
handlers.requestCurrency = function (args) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);
    var userInventoryObject = server.GetUserInventory(
    {
        PlayFabId: currentPlayerId,
    }
    );
    var r =
    {
        VirtualCurrency: userInventoryObject.VirtualCurrency
    };
    return r;
};
handlers.requestInventory = function (args) {
    //var mC = CheckMaintenanceAndVersion(args);
    //if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
    var userInventoryObject = server.GetUserInventory(
    {
        PlayFabId: currentPlayerId,
    }
    );
    //let's update the user's current currency statistics
    var sc = Number(userInventoryObject.VirtualCurrency.SC);
    if (isNaN(sc) || sc < 0) sc = 0;

    var hc = Number(userInventoryObject.VirtualCurrency.HC);
    if (isNaN(hc) || hc < 0) hc = 0;

    var suArray = [];
    var sum = { StatisticName: "CurrentMoney", Version: "0", Value: sc };
    suArray.push(sum);
    var sug = { StatisticName: "CurrentGold", Version: "0", Value: hc };
    suArray.push(sug);
    var updateRequest = server.UpdatePlayerStatistics(
       {
           PlayFabId: currentPlayerId,
           Statistics: suArray
       }
       );
    //get catalog data for pr calculation
    var carCardsCatalog = server.GetCatalogItems(
         {
             CatalogVersion: "CarCards"
         }
         );
    var partCardsCatalog = server.GetCatalogItems(
       {
           CatalogVersion: "PartCards"
       }
       );
    var hasCars = false;
    for (var i = 0; i < userInventoryObject.Inventory.length; i++) {
        if (userInventoryObject.Inventory[i].CatalogVersion == "CarsProgress") {
            hasCars = true;
            var check = checkCarDataValidity(userInventoryObject.Inventory[i], carCardsCatalog);
            //log.debug("check " + check);
            if ((check == "PlayFabError") || (check === undefined)) return generateErrObj("PlayfabError");
            else if (check == "OK") log.debug("Data for " + userInventoryObject.Inventory[i].ItemId + " OK");
            else userInventoryObject.Inventory[i].CustomData = check;
            userInventoryObject.Inventory[i].CustomData.Pr = recalculateCarPr(userInventoryObject.Inventory[i].CustomData, userInventoryObject.Inventory[i].ItemId, carCardsCatalog, partCardsCatalog);
            var d = {};
            d["Pr"] = userInventoryObject.Inventory[i].CustomData.Pr;
            server.UpdateUserInventoryItemCustomData( // if this doesn't happen it's still fine; we might actually be able to skip this entirely
            {
                PlayFabId: currentPlayerId,
                ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
                Data: d
            }
            );
        }
    }
    if (hasCars === false) {
        var carsToGive = [];
        carsToGive.push("FordFocus");
        var carRequest = server.GrantItemsToUser(
        {
            CatalogVersion: "CarsProgress",
            PlayFabId: currentPlayerId,
            ItemIds: carsToGive
        }
        );
        var CarData = { "CarLvl": "1", "EngineLvl": "0", "ExhaustLvl": "0", "GearboxLvl": "0", "SuspensionLvl": "0" };
        server.UpdateUserInventoryItemCustomData(
        {
            PlayFabId: currentPlayerId,
            ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
            Data: CarData
        }
        );
        CarData = { "TiresLvl": "0", "TurboLvl": "0", "PaintId": "0", "DecalId": "0", "RimsId": "0" };
        server.UpdateUserInventoryItemCustomData(
        {
            PlayFabId: currentPlayerId,
            ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
            Data: CarData
        }
        );
        CarData = { "PlatesId": "0", "WindshieldId": "0", "Pr": "10" };
        server.UpdateUserInventoryItemCustomData(
        {
            PlayFabId: currentPlayerId,
            ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
            Data: CarData
        }
        );
        return generateErrObj("UserHasNoCars ... reiniting");
    }
    return userInventoryObject;
};
handlers.retrieveBlackMarket = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (args.reset === true) {
        if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);
    }

    //let's get last BM Time Call
    var keysToGet = [];
    keysToGet.push("BMTime");
    for (var i = 0; i < 4; i++) {
        keysToGet.push("BMItem" + i);
    }

    var getInternalDataResult = server.GetUserInternalData(
      {
          PlayFabId: currentPlayerId,
          Keys: keysToGet
      }
      );

    if (getInternalDataResult.Data.BMTime === undefined) {
        //log.debug("No user BM data detected; generating ...");
        return GenerateBlackMarket(currentPlayerId);
    }

    var d = new Date();
    //log.debug("milliseconds passed: " +  d.getTime());
    //log.debug("BMTime: " +  getInternalDataResult.Data.BMTime.Value);

    var tK = [];
    tK.push("BlackMarketResetMinutes");
    var tData = server.GetTitleData(
      {
          PlayFabId: currentPlayerId,
          Keys: tK
      }
      );
    if (args.reset === true) {
        //log.debug("reseting market");
        var curr = "HC";
        var cost = 200;
        var td = server.GetTitleData(
        {
            Keys: ["BlackMarketResetCost"]
        });
        if (td.Data["BlackMarketResetCost"] !== undefined) {
            var tDatArr = td.Data["BlackMarketResetCost"].split("_");
            curr = tDatArr[0];
            cost = Number(tDatArr[1]);
        }

        if (cost > 0) {
            var userInventoryObject = server.GetUserInventory(
            {
                PlayFabId: currentPlayerId
            }
            );

            var bO = checkBalance(curr, cost, userInventoryObject.VirtualCurrency.SC, userInventoryObject.VirtualCurrency.HC);
            if (bO != "OK") return generateFailObj("not enough money");

            var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
              {
                  PlayFabId: currentPlayerId,
                  VirtualCurrency: curr,
                  Amount: cost
              }
              );
            updateCurrencySpentStatistic(curr, cost);
            var marketObject = GenerateBlackMarket(currentPlayerId);
            ////////////////
            var currencyUpdated = {};
            currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
            i =
               {
                   VirtualCurrency: currencyUpdated
               };
            marketObject["InventoryChange"] = i;
            return marketObject;
            ////////////////
        }
        return GenerateBlackMarket(currentPlayerId);
    }

    if (d.getTime() - parseInt(getInternalDataResult.Data.BMTime.Value) > parseInt(tData.Data.BlackMarketResetMinutes) * 60 * 1000) // minutes *60*1000
    {
        //log.debug("regenerating market");
        if (mC != "OK") GetCurrentBlackMarket(currentPlayerId, getInternalDataResult);
        return GenerateBlackMarket(currentPlayerId);
    }
    //log.debug("get current market");
    return GetCurrentBlackMarket(currentPlayerId, getInternalDataResult);
};
handlers.rewardUsers = function (args, context) {
    var ps = server.GetPlayerStatistics({
        PlayFabId: currentPlayerId,
        StatisticNames: ["Experience", "TrophyCount"]
    }).Statistics;
    var currentExprience = GetValueFromStatistics(ps, "Experience", 0); // 0 - 80000
    var currentTrophies = GetValueFromStatistics(ps, "TrophyCount", 0); // 0 - 3000

    var trophyDiff = 0;
    var expToGive = 0;
    if (currentExprience <= 0) {
        trophyDiff = (Number(currentTrophies) / 3000);
        expToGive = Number(Math.floor(trophyDiff * 800));
    }
    currentExprience = Number(currentExprience) + expToGive;

    var updateRequest = server.UpdatePlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        Statistics: [{ StatisticName: "Experience", Version: "0", Value: currentExprience }]
    });
    return currentExprience;
}

handlers.setMainCar = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    var userInventoryObject = server.GetUserInventory(
    {
        PlayFabId: currentPlayerId
    }
  	);
    var mainCarInfo = {};
    for (var i = 0; i < userInventoryObject.Inventory.length; i++) {
        if ((userInventoryObject.Inventory[i].ItemId == args.carId) && (userInventoryObject.Inventory[i].CatalogVersion == "CarsProgress")) {
            mainCarInfo["carId"] = userInventoryObject.Inventory[i].ItemId;
            mainCarInfo["carData"] = userInventoryObject.Inventory[i].CustomData;
            updateUserProfileInfo(currentPlayerId, mainCarInfo);
            break;
        }
    }
}

function updateProfileCar(args, context, userId) {

    var userPorfileObject = server.GetUserReadOnlyData(
      {
          PlayFabId: userId,
          Keys: ["UserProfileInfo"]
      }
      );
    if (userPorfileObject.Data == undefined) return;
    if (userPorfileObject.Data.UserProfileInfo == undefined) return;
    if (userPorfileObject.Data.UserProfileInfo.Value == undefined) return;
    var upObj = JSON.parse(userPorfileObject.Data.UserProfileInfo.Value);
    if (upObj.CarData.carId == args.carId)
        handlers.setMainCar(args, context);
} handlers.skipTutorial = function (args, content) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    var tc = server.GetPlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        StatisticNames: ["TrophyCount"]
    });
    var trophyCount = 0;
    if (tc.Statistics.length != 0) {
        trophyCount = tc.Statistics[0].Value;
    }
    trophyCount = Number(trophyCount);

    if (trophyCount <= 0) {
        trophyCount = 1;
    }

    var suArray = [];
    //var su = {StatisticName: "WinLoss", Version : "0", Value: wlStatInt};
    //suArray.push(su);
    var sut = { StatisticName: "TrophyCount", Value: trophyCount };
    suArray.push(sut);

    var updateRequest = server.UpdatePlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        Statistics: suArray
    }
    );
    return { "trophies": trophyCount };
}
handlers.slotChestOperation = function (args, context) {
    //CHEST SLOTS INFO
    //SLOTS HAVE 4 STATES: 
    //"Empty" <- no chest, chestID will be null
    //"Occupied" <- chest in standard state
    //"Incoming" <- chest that has been "ordered" and will arrive in set amount of time set in each chests custom data in "Chests" catalog data. Only 1 chest may be "Incoming" at any one time
    //"Arrived" <- chest that is openable as a result of waiting the "Incoming" period or performing the "rush".

    //let's get the user's slots chest info
    var chestData = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["ChestSlotsStatus"]
	});

    //check user slots data validity.
    if (chestData.Data.ChestSlotsStatus == undefined) return generateErrObj("No Chest Data found!");

    var slotArray = JSON.parse(chestData.Data.ChestSlotsStatus.Value);

    //check slot idx is within range
    if ((Number(args.slotIndex) >= slotArray.length) || (Number(args.slotIndex) < 0)) return generateErrObj("Invalid slot index");

    var operation = args.operation;
    //check if slot is
    if (slotArray[(Number(args.slotIndex))].status == "Empty") return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // there is no chest in this slot. Refresh the client's chest slot info status

    //let's now get the chests catalogData
    var catalogData = server.GetCatalogItems({ CatalogVersion: "Chests" });

    switch (operation) {
        //"order" works only on "Occupied" slot state
        //after succesfull operation slot state changes to "Incoming"
        case "order":
            {
                //let's check if there are any other chests in "Incoming State"
                for (var i = 0; i < slotArray.length; i++) {
                    if ((slotArray[i].status == "Incoming") && (slotArray[i].arrivalTimeStamp > Math.floor((new Date().getTime() / 1000)))) return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // there is already a chest in "Incoming state". Refresh the client's chest slot info status
                }

                //only slots that are in state "Occupied" may be set ordered and set to "Incoming" state
                if (slotArray[(Number(args.slotIndex))].status != "Occupied") return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // there is no chest in this slot. Refresh the client's chest slot info status

                slotArray[(Number(args.slotIndex))].status = "Incoming";
                var d = new Date();
                slotArray[(Number(args.slotIndex))].orderTimeStamp = Math.floor(Number(d.getTime()) / 1000);
                //let's get the catalog data for our slot's chest
                // we require: hoursToOpen (splitable array)
                var hoursToOpen;
                var chestInfo;
                for (var i = 0; i < catalogData.Catalog.length; i++) {
                    if (catalogData.Catalog[i].ItemId == slotArray[(Number(args.slotIndex))].chestId) {
                        chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
                        var hoursToOpenArr = chestInfo.hoursToOpen.split(",");
                        if (slotArray[(Number(args.slotIndex))].chestLeague == "0") // arena 0 has same opening time as arena 1 exception
                            hoursToOpen = Number(hoursToOpenArr[0]);
                        else
                            hoursToOpen = Number(hoursToOpenArr[Math.min(Number(slotArray[(Number(args.slotIndex))].chestLeague) - 1, hoursToOpenArr.length - 1)]);
                    }
                }
                log.debug("hoursToOpen: " + hoursToOpen);
                slotArray[(Number(args.slotIndex))].arrivalTimeStamp = Number(slotArray[(Number(args.slotIndex))].orderTimeStamp) + Math.floor(hoursToOpen * 3600);
                if (chestInfo == undefined) return generateErrObj("Could not find chest with id: " + slotArray[(Number(args.slotIndex))].chestId + " in the Chests catalog, or this chest's custom data is undefined");

                //let's update the user's chest slot data
                var chestSlotInfoString = JSON.stringify(slotArray);
                server.UpdateUserInternalData(
                {
                    PlayFabId: currentPlayerId,
                    Data:
                    {
                        "ChestSlotsStatus": chestSlotInfoString
                    }
                });

                var r = {
                    "Result": "OK",
                    "ChestSlotInfo": slotArray
                }

                return r;

            }
            break;

            //"rush" works on "Occupied" slot state or on "Incoming" slot state with reduced cost proportional with time passed of the total time needed for chest to change from "Incoming" to "Arrived"
            //after succesfull operation slot state changes to "Arrived"
        case "rush":
            {
                //only slots that are in state that are not "Arrived" or "Empty" may be set ordered and set to "Incoming" state. We already checked for "Empty" prior
                if (slotArray[(Number(args.slotIndex))].status == "Arrived") return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // invalid operation on this slot

                // let's get the catalog data for our slot's chest
                // we require: hoursToOpen (splitable array) and priceToUnlock (Number)
                var priceToUnlock;
                var hoursToOpen; //total
                var chestInfo;
                for (var i = 0; i < catalogData.Catalog.length; i++) {
                    if (catalogData.Catalog[i].ItemId == slotArray[(Number(args.slotIndex))].chestId) {
                        chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
                        priceToUnlock = Number(chestInfo.priceToUnlock);
                        var hoursToOpenArr = chestInfo.hoursToOpen.split(",");
                        if (slotArray[(Number(args.slotIndex))].chestLeague == 0) // arena 0 has same opening time as arena 1 exception
                            hoursToOpen = Number(hoursToOpenArr[0]);
                        else
                            hoursToOpen = Number(hoursToOpenArr[Math.min(Number(slotArray[(Number(args.slotIndex))].chestLeague), hoursToOpenArr.length - 1)]);
                    }
                }

                var r; // return result

                //let's calculate the amount of gold user needs to spend to rush this chest in case it's in the "Incoming state"
                var d = new Date();
                var t = 0; // interpolator
                if (slotArray[(Number(args.slotIndex))].status == "Occupied") // if we rush an "Occupied" state slot rushPrice = priceToUnlock and therefore the interpolator will be 1.
                    t = 1;
                else //"Incoming" state
                    t = (Number(slotArray[(Number(args.slotIndex))].arrivalTimeStamp) - Math.floor(Number(d.getTime()) / 1000)) / (hoursToOpen * 3600);

                log.debug("interpolator: " + t);
                if (t <= 0) //this means that the chest had arrived already. This may happen on rare occasions when client and server are a few seconds out of sync
                {
                    slotArray[(Number(args.slotIndex))].status = "Arrived";
                    slotArray[(Number(args.slotIndex))].arrivalTimeStamp = 0; // set this for the client

                    r = {
                        Result: "OK",
                        ChestSlotInfo: slotArray
                    };
                }
                else {
                    var rushPrice = Math.floor(1 + t * (priceToUnlock - 1));

                    log.debug("rushPrice: " + rushPrice);

                    //we now have to querry the user's inventory to see if he has enough currency to rush the chest
                    var userInventoryObject = server.GetUserInventory(
                    {
                        PlayFabId: currentPlayerId
                    });

                    if (rushPrice > userInventoryObject.VirtualCurrency.HC) return generateErrObj("Not enough HC.");

                    //let's set the user's chest slot info to "Arrived"
                    slotArray[(Number(args.slotIndex))].status = "Arrived";
                    slotArray[(Number(args.slotIndex))].arrivalTimeStamp = 0; // set this for the client
                    slotArray[(Number(args.slotIndex))].orderTimeStamp = 1; // set this for the client

                    //let's subtract rushPrice amount of gold from the user
                    var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
                    {
                        PlayFabId: currentPlayerId,
                        VirtualCurrency: "HC",
                        Amount: rushPrice
                    });
                    //update the CurrencySpent stat for this user
                    updateCurrencySpentStatistic("HC", rushPrice);

                    var currencyUpdated = {};
                    currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
                    var i =
                      {
                          VirtualCurrency: currencyUpdated
                      };

                    r = {
                        Result: "OK",
                        InventoryChange: i,
                        ChestSlotInfo: slotArray
                    };
                }

                //let's update the user's chest slot data
                var chestSlotInfoString = JSON.stringify(slotArray);
                server.UpdateUserInternalData(
                {
                    PlayFabId: currentPlayerId,
                    Data:
                    {
                        "ChestSlotsStatus": chestSlotInfoString
                    }
                });

                return r;
            }
            break;

        case "open":
            {
                var slotIndex = Number(args.slotIndex);
                var chestInfo;
                for (var i = 0; i < catalogData.Catalog.length; i++) {
                    if (catalogData.Catalog[i].ItemId == slotArray[(Number(args.slotIndex))].chestId) {
                        chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
                        break;
                    }
                }
                if (chestInfo == undefined) return generateErrObj("Could not find chest with id: " + slotArray[(Number(args.slotIndex))].chestId + " in the Chests catalog, or this chest's custom data is undefined");
                if (slotArray[slotIndex].status == "Empty") return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // invalid operation on this slot
                if (slotArray[slotIndex].status == "Occupied") return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // invalid operation on this slot
                if ((slotArray[slotIndex].status == "Incoming") && (slotArray[slotIndex].arrivalTimeStamp > Math.floor((new Date().getTime() / 1000)))) return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // invalid operation on this slot

                var chestBounty = GenerateChestBounty(currentPlayerId, slotArray[slotIndex].chestId, slotArray[slotIndex].chestLeague, chestInfo);

                var outInventory = server.GetUserInventory({ PlayFabId: currentPlayerId });
                var totalXp = UpdateExperience("Chests", slotArray[slotIndex].chestId, "xpGain", 0, true);
                outInventory.Experience = totalXp;

                var returnObject = {
                    Result: "OK",
                    InventoryChange: outInventory,
                    ChestBounty: chestBounty
                }

                slotArray[slotIndex].chestId = null;
                slotArray[slotIndex].chestLeague = 0;
                slotArray[slotIndex].status = "Empty";
                slotArray[slotIndex].orderTimeStamp = 0;
                slotArray[slotIndex].arrivalTimeStamp = 0;

                //let's update the user's chest slot data
                var chestSlotInfoString = JSON.stringify(slotArray);
                server.UpdateUserInternalData(
                {
                    PlayFabId: currentPlayerId,
                    Data:
                    {
                        "ChestSlotsStatus": chestSlotInfoString
                    }
                });

                return returnObject;
            }
            break;

    }

}

//this function will return the contents of a chests that's been opened and grant them to the user's inventory
// args
// chestId <- string id of chest i.e. "SilverChest" as found in the Chests Economy Catalog
// cheastLeague <- league of chest
// chestInfo <- Custom chest info found in catalog data for this particular chest. Must be passed as argument
function GenerateChestBounty(currentPlayerId, chestId, league, chestInfo) {
    var actualChestLeague = Number(league) + Number(chestInfo.arenasAdvance);
    var minimumCarLeague = actualChestLeague;
    if (chestInfo.leaguesBehind != undefined) minimumCarLeague = Number(league) - Number(chestInfo.leaguesBehind);
    minimumCarLeague = Math.min(Math.max(minimumCarLeague, 1), actualChestLeague);
    var currentStacks = 0;
    var currencyStacks = 0;
    var maxStacks = Number(chestInfo.maxCardStacks);


    var currencyUpdated = {};
    //let's calculate SC
    var scToGive = 0;
    var scArrSplit = chestInfo.guaranteedSC.split(",");
    switch (scArrSplit.length) {
        case 1:
            {
                scToGive = Number(scArrSplit[0]);
            } break;
        case 2:
            {
                scToGive = Number(scArrSplit[0]) + Math.floor(Math.random() * Math.abs(Number(scArrSplit[1]) - Number(scArrSplit[0])));
            } break;
        default:
            {
                scToGive = 0;
            }
    }
    if (scToGive > 0) {
        currencyUpdated["SC"] = scToGive;
        currentStacks++;
    }

    //let's calculate HC
    var hcToGive = 0;
    var hcArrSplit = chestInfo.guaranteedHC.split(",");
    switch (hcArrSplit.length) {
        case 1:
            {
                hcToGive = Number(hcArrSplit[0]);
            } break;
        case 2:
            {
                hcToGive = Number(hcArrSplit[0]) + Math.floor(Math.random() * Math.abs(Number(hcArrSplit[1]) - Number(hcArrSplit[0])));
            } break;
        default:
            {
                hcToGive = 0;
            }
    }
    if (hcToGive > 0) {
        currencyUpdated["HC"] = hcToGive;
        currentStacks++;
    }

    currencyStacks = currentStacks;

    //let's give guaranteed stacks
    //let's get the car catalog
    var carsCatalog = server.GetCatalogItems({ CatalogVersion: "CarCards" });
    var partsCatalog = server.GetCatalogItems({ CatalogVersion: "PartCards" });
    //CARS LISTS
    var carInfo;
    var commonCarsList = [];
    var rareCarsList = [];
    var epicCarsList = [];

    for (var i = 0; i < carsCatalog.Catalog.length; i++) {
        carInfo = JSON.parse(carsCatalog.Catalog[i].CustomData);
        if (carInfo == undefined) continue;
        if (carInfo.unlockedAtRank == undefined) continue;
        if (Number(carInfo.unlockedAtRank) > Number(actualChestLeague)) continue;
        if (Number(carInfo.unlockedAtRank) < Number(minimumCarLeague)) continue;
        if (carInfo.rarity == undefined) continue;
        switch (Number(carInfo.rarity)) {
            case 0: // common
                {
                    commonCarsList.push(carsCatalog.Catalog[i].ItemId);
                } break;
            case 1: // rare
                {
                    rareCarsList.push(carsCatalog.Catalog[i].ItemId);
                } break;
            case 2: // epic
                {
                    epicCarsList.push(carsCatalog.Catalog[i].ItemId);
                } break;
            default:
                {
                    epicCarsList.push(carsCatalog.Catalog[i].ItemId);
                }
        }
    }

    //PARTS LIST
    var partInfo;
    var commonPartsList = [];
    var rarePartsList = [];
    var epicPartsList = [];

    for (var i = 0; i < partsCatalog.Catalog.length; i++) {
        partInfo = JSON.parse(partsCatalog.Catalog[i].CustomData);
        if (partInfo.rarity == undefined) continue;
        switch (Number(partInfo.rarity)) {
            case 0: // common
                {
                    commonPartsList.push(partsCatalog.Catalog[i].ItemId);
                } break;
            case 1: // rare
                {
                    rarePartsList.push(partsCatalog.Catalog[i].ItemId);
                } break;
            case 2: // epic
                {
                    epicPartsList.push(partsCatalog.Catalog[i].ItemId);
                } break;
            default:
                {
                    epicPartsList.push(partsCatalog.Catalog[i].ItemId);
                }
        }
    }
    log.debug(" === Parts Arrats: Common Ln " + commonPartsList.length + " Rare Ln " + rarePartsList.length + " Epic Ln " + epicPartsList.length);
    // END PARTS LIST
    //now, we must reserve some stacks for the guaranteed cards (we have to limit the number of stacks used up by guaranteed cards, so we leave room for the random cards)

    //but only if there are any guaranteed car cards in the chest in the first place
    var chestContainsGuaranteedCarCards = false;
    var totalGuaranteedCarCards = 0;
    var guaranteedCarsPerRarityArr = chestInfo.guaranteedCarsPerRarity.split(",");
    for (var i = 0 ; i < guaranteedCarsPerRarityArr.length; i++) {
        totalGuaranteedCarCards += Number(guaranteedCarsPerRarityArr[i]);
    }
    if (Number(totalGuaranteedCarCards) > 0) chestContainsGuaranteedCarCards = true;

    //FINAL LISTS OF CARDS
    //cars
    var commonCarsListFinal;
    var rareCarsListFinal;
    var epicCarsListFinal;

    //parts
    var commonPartsListFinal;
    var rarePartsListFinal;
    var epicPartsListFinal;
    var ln;
    //if we have at least 1 guaranteed car card in the chest
    if (chestContainsGuaranteedCarCards == true) {
        var maxStacksReservedForGuaranteedCars = Number(Math.floor((maxStacks - currentStacks) * 0.55));
        if (maxStacksReservedForGuaranteedCars <= 0) maxStacksReservedForGuaranteedCars = 1;

        //now we iterate through the rarities and generate the guaranteed car cards for each rarity
        for (var rarity = 0; rarity < 3; rarity++) {
            //skip this rarity if no cards are guaranteed
            if (Number(guaranteedCarsPerRarityArr[rarity]) <= 0) continue;
            //allocate stacks based on the number of guaranteed cards for this rarity and totalGuaranteedCarCards ratio
            var stacksAllocatedForThisRarity = Math.floor((
                                                    Number(guaranteedCarsPerRarityArr[rarity])
                                                    / totalGuaranteedCarCards)
                                                    * maxStacksReservedForGuaranteedCars
                                                    );
            if (stacksAllocatedForThisRarity <= 0)
                stacksAllocatedForThisRarity = 1;
            //start randomly distributing the guaranteed cars. If we havent reached the stacksAllocatedForThisRarity, we can create new stacks, increment existing ones otherwise
            for (var i = 0; i < Number(guaranteedCarsPerRarityArr[rarity]) ; i++) {
                //pick a car from the eligible list
                var car;
                switch (rarity) {
                    case 0:
                        {
                            if (commonCarsListFinal == undefined) ln = 0;
                            else ln = Number(commonCarsListFinal.length);
                            if (ln == undefined) ln = 0;
                            var canCreateNewStack = ln < stacksAllocatedForThisRarity;
                            car = GetRandomCard(commonCarsList, actualChestLeague);
                            if (car == "ERROR") break;
                            commonCarsListFinal = AddCardToListOfStacks("CarCards", commonCarsListFinal, car, canCreateNewStack);
                        } break;
                    case 1:
                        {
                            if (rareCarsListFinal == undefined) ln = 0;
                            else ln = Number(rareCarsListFinal.length);
                            if (ln == undefined) ln = 0;
                            var canCreateNewStack = ln < stacksAllocatedForThisRarity;
                            car = GetRandomCard(rareCarsList, actualChestLeague);
                            if (car == "ERROR") break;
                            rareCarsListFinal = AddCardToListOfStacks("CarCards", rareCarsListFinal, car, canCreateNewStack);
                        } break;
                    case 2:
                        {
                            if (epicCarsListFinal == undefined) ln = 0;
                            else ln = Number(epicCarsListFinal.length);
                            if (ln == undefined) ln = 0;
                            var canCreateNewStack = ln < stacksAllocatedForThisRarity;
                            car = GetRandomCard(epicCarsList, actualChestLeague);
                            if (car == "ERROR") break;
                            epicCarsListFinal = AddCardToListOfStacks("CarCards", epicCarsListFinal, car, canCreateNewStack);
                        } break;
                    default:
                        {
                            car = "ERROR";
                        }
                }
                //if(car == "ERROR") return "Error";       	

            }
        }
    }
    if (commonCarsListFinal != undefined) currentStacks += commonCarsListFinal.length;
    if (rareCarsListFinal != undefined) currentStacks += rareCarsListFinal.length;
    if (epicCarsListFinal != undefined) currentStacks += epicCarsListFinal.length;

    //Generate the random card rewards
    log.debug("== part rarity droprates: " + chestInfo.partRarityDroprates);
    var partRarityDroprates = chestInfo.partRarityDroprates.split(",");
    var sumOfPartWeights = 0;
    for (var i = 0; i < partRarityDroprates.length; i++) {
        log.debug("== part rarity droprate[" + i + "]" + partRarityDroprates[i]);
        sumOfPartWeights += partRarityDroprates[i];
    }
    var carRarityDroprates = chestInfo.carRarityDroprates.split(",");
    var sumOfCarWeights = 0;
    for (var i = 0; i < carRarityDroprates.length; i++) {
        sumOfCarWeights += carRarityDroprates[i];
    }

    var partBias = 70; // chance that a rnadom card will be a part
    var canCreateNewStack;
    var currentRarity = 0;
    var tempString;
    var beforeLn;
    for (var i = 0; i < Number(chestInfo.randomCardsReward) ; i++) {
        canCreateNewStack = currentStacks < maxStacks;
        //is it a part or a car?
        if (Math.floor(Math.random() * 100) < partBias) // this is a part
        {
            currentRarity = WeightedRandom(partRarityDroprates);
            switch (currentRarity) {
                case 0:
                    {
                        tempString = GetRandomCard(commonPartsList, actualChestLeague);
                        if (tempString == "ERROR") break;
                        if (commonPartsListFinal == undefined) beforeLn = 0;
                        else beforeLn = commonPartsListFinal.length;

                        if (beforeLn == undefined) beforeLn = 0;
                        commonPartsListFinal = AddCardToListOfStacks("PartCards", commonPartsListFinal, tempString, canCreateNewStack);
                        if (commonPartsListFinal.length > beforeLn) currentStacks++;
                    } break;
                case 1:
                    {
                        tempString = GetRandomCard(rarePartsList, actualChestLeague);
                        if (tempString == "ERROR") break;
                        if (rarePartsListFinal == undefined) beforeLn = 0
                        else beforeLn = rarePartsListFinal.length;
                        if (beforeLn == undefined) beforeLn = 0;
                        rarePartsListFinal = AddCardToListOfStacks("PartCards", rarePartsListFinal, tempString, canCreateNewStack);
                        if (rarePartsListFinal.length > beforeLn) currentStacks++;
                    } break;
                case 2:
                    {
                        tempString = GetRandomCard(epicPartsList, actualChestLeague);
                        if (tempString == "ERROR") break;
                        if (epicPartsListFinal == undefined) beforeLn = 0
                        else beforeLn = epicPartsListFinal.length;
                        if (beforeLn == undefined) beforeLn = 0;
                        epicPartsListFinal = AddCardToListOfStacks("PartCards", epicPartsListFinal, tempString, canCreateNewStack);
                        if (epicPartsListFinal.length > beforeLn) currentStacks++;
                    } break;
            }
        }
        else {
            currentRarity = WeightedRandom(carRarityDroprates);
            switch (currentRarity) {
                case 0:
                    {
                        tempString = GetRandomCard(commonCarsList, actualChestLeague);
                        if (tempString == "ERROR") break;
                        if (commonCarsListFinal == undefined) beforeLn = 0
                        else beforeLn = commonCarsListFinal.length;
                        if (beforeLn == undefined) beforeLn = 0;
                        commonCarsListFinal = AddCardToListOfStacks("CarCards", commonCarsListFinal, tempString, canCreateNewStack);
                        if (commonCarsListFinal.length > beforeLn) currentStacks++;
                    } break;
                case 1:
                    {
                        tempString = GetRandomCard(rareCarsList, actualChestLeague);
                        if (tempString == "ERROR") break;
                        if (rareCarsListFinal == undefined) beforeLn = 0
                        else beforeLn = rareCarsListFinal.length;
                        if (beforeLn == undefined) beforeLn = 0;
                        rareCarsListFinal = AddCardToListOfStacks("CarCards", rareCarsListFinal, tempString, canCreateNewStack);
                        if (rareCarsListFinal.length > beforeLn) currentStacks++;
                    } break;
                case 2:
                    {
                        tempString = GetRandomCard(epicCarsList, actualChestLeague);
                        if (tempString == "ERROR") break;
                        if (epicCarsListFinal == undefined) beforeLn = 0
                        else beforeLn = epicCarsListFinal.length;
                        if (beforeLn == undefined) beforeLn = 0;
                        epicCarsListFinal = AddCardToListOfStacks("CarCards", epicCarsListFinal, tempString, canCreateNewStack);
                        if (epicCarsListFinal.length > beforeLn) currentStacks++;
                    } break;
            }
        }

    }
    //var dataChangedLn = currentStacks + currentStacks;
    var dataChanged = [];
    if (commonCarsListFinal != undefined) dataChanged = dataChanged.concat(commonCarsListFinal);
    if (rareCarsListFinal != undefined) dataChanged = dataChanged.concat(rareCarsListFinal);
    if (epicCarsListFinal != undefined) dataChanged = dataChanged.concat(epicCarsListFinal);
    if (commonPartsListFinal != undefined) dataChanged = dataChanged.concat(commonPartsListFinal);
    if (rarePartsListFinal != undefined) dataChanged = dataChanged.concat(rarePartsListFinal);
    if (epicPartsListFinal != undefined) dataChanged = dataChanged.concat(epicPartsListFinal);

    //apply arena bias
    var balanceCatalog = server.GetCatalogItems({ CatalogVersion: "Balancing" });
    var balanceInfo = JSON.parse(balanceCatalog.Catalog[0].CustomData);
    var tArena = Math.min(Number(league), 10);
    var arenaBonus = Number(balanceInfo.ArenaBonuses[tArena]);
    if (arenaBonus > 0)
        for (var i = 0; i < dataChanged.length; i++) {
            dataChanged[i].CustomData.Amount = Math.floor(Number(dataChanged[i].CustomData.Amount) + Number(dataChanged[i].CustomData.Amount) * (arenaBonus / 100));
        }

    //let's give the user the money
    var addUserCurrencyResult;
    //HC
    if (currencyUpdated.HC != undefined) {
        currencyUpdated.HC = Math.floor(Number(currencyUpdated.HC) + Number(currencyUpdated.HC) * (arenaBonus / 100));
        if (Number(currencyUpdated.HC) > 0)
            addUserCurrencyResult = server.AddUserVirtualCurrency(
              {
                  PlayFabId: currentPlayerId,
                  VirtualCurrency: "HC",
                  Amount: Number(currencyUpdated.HC)
              });
    }
    //HC
    if (currencyUpdated.SC != undefined) {
        currencyUpdated.SC = Math.floor(Number(currencyUpdated.SC) + Number(currencyUpdated.SC) * (arenaBonus / 100));
        if (Number(currencyUpdated.SC) > 0)
            addUserCurrencyResult = server.AddUserVirtualCurrency(
              {
                  PlayFabId: currentPlayerId,
                  VirtualCurrency: "SC",
                  Amount: Number(currencyUpdated.SC)
              });
    }
    //Let's grant the user the items
    var userInventoryObject = server.GetUserInventory({ PlayFabId: currentPlayerId });

    var itemFound = false;
    var newAmount = 0;
    var iData;
    for (var i = 0; i < dataChanged.length; i++) {
        for (var j = 0; j < userInventoryObject.Inventory.length; j++) {
            itemFound = false;
            newAmount = 0;
            if ((userInventoryObject.Inventory[j].ItemId == dataChanged[i].ItemId) && (userInventoryObject.Inventory[j].CatalogVersion == dataChanged[i].CatalogVersion)) // we found the item
            {
                if (userInventoryObject.Inventory[j].CustomData == undefined) {
                    newAmount = Number(dataChanged[i].CustomData.Amount);
                }
                else {
                    if (userInventoryObject.Inventory[j].CustomData.Amount == undefined)
                        newAmount = Number(dataChanged[i].CustomData.Amount);
                    else {
                        if (isNaN(Number(userInventoryObject.Inventory[j].CustomData.Amount)))
                            newAmount = Number(dataChanged[i].CustomData.Amount);
                        else
                            newAmount = Number(userInventoryObject.Inventory[j].CustomData.Amount) + Number(dataChanged[i].CustomData.Amount);
                    }
                }
                iData = { "Amount": newAmount };
                server.UpdateUserInventoryItemCustomData(
                  {
                      PlayFabId: currentPlayerId,
                      ItemInstanceId: userInventoryObject.Inventory[j].ItemInstanceId,
                      Data: iData
                  }
                );
                itemFound = true;
                break;
            }
        }
        if (itemFound == false) {
            var itemsToGrant = [dataChanged[i].ItemId];
            var grantVar = server.GrantItemsToUser(
              {
                  CatalogVersion: dataChanged[i].CatalogVersion,
                  PlayFabId: currentPlayerId,
                  ItemIds: itemsToGrant
              }
            );

            iData = { "Amount": dataChanged[i].CustomData.Amount };
            server.UpdateUserInventoryItemCustomData(
              {
                  PlayFabId: currentPlayerId,
                  ItemInstanceId: grantVar.ItemGrantResults[0].ItemInstanceId,
                  Data: iData
              }
            );
        }
    }

    var chestItems =
     {
         Inventory: dataChanged,
         VirtualCurrency: currencyUpdated
     };

    return chestItems;
}

//function will fill an empty chest slot with the appropriate chest
// args
// currentPlayerId <- user's playFab ID
// source <- where the chest came from : "endGameNormal", "endGameFreeWin" or "tutorial"
function grantUserChest(currentPlayerId, source) {
    //let's get the chests catalog data
    var catalogData = server.GetCatalogItems({ CatalogVersion: "Chests" });

    //let's also get the user's chest slot info data
    var chestData = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["ChestSlotsStatus"]
	});

    //check user slots data validity.
    if (chestData.Data.ChestSlotsStatus == undefined) return generateErrObj("No Chest Data found!");

    var slotArray = JSON.parse(chestData.Data.ChestSlotsStatus.Value);

    var slotIndex = -1; //what's the slot index that this operation will fill with a chest? if -1 then all slots are full
    //let's check if there are any Empty slots. If not then we give the user nothing
    for (var i = 0; i < slotArray.length; i++) {
        if (slotArray[i].status == "Empty") {
            slotIndex = i;
            break;
        }
    }

    if (slotIndex < 0) return; // we found no empty slot. No further operations necessary
    log.debug("emptySlotFound: " + slotIndex);
    //we need the trophy count to calculate the league the user is in
    var tc = server.GetPlayerStatistics(
	  {
	      PlayFabId: currentPlayerId,
	      StatisticNames: ["TrophyCount"]
	  });
    var trophyCount = 0;
    if (tc.Statistics.length != 0) {
        trophyCount = tc.Statistics[0].Value;
    }
    trophyCount = Number(trophyCount);
    var cLeague = Number(calculateLeague(trophyCount));
    //the source can be "endGameNormal", "endGameFreeWin" and "tutorial"
    switch (source) {
        case "endGameNormal": // we examine all the chests' "dropChance" variable and decide which will drop and fill the user's slot 
            {
                var chestInfo;
                var sumOfWeights = 0;
                var leftRange = 0;
                var rightRange = 0;
                var chestWeightsArray = [];
                for (var i = 0; i < catalogData.Catalog.length; i++) {
                    chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
                    if (Number(chestInfo.dropChance) <= 0) continue; // this chest will never be added to a slot in this manner
                    sumOfWeights += Number(chestInfo.dropChance) * 10; //we multiply by 10 for drop chances that have a decimal point
                    leftRange = rightRange;
                    rightRange = sumOfWeights;
                    var chestItem =
                    {
                        "chestId": catalogData.Catalog[i].ItemId,
                        "leftRange": leftRange,
                        "rightRange": rightRange
                    }
                    chestWeightsArray.push(chestItem);
                }
                if (chestWeightsArray.length <= 0) // if for whatever reason the chestWeightArray is 0 we will grant the user the "SilverChest"
                {
                    slotArray[slotIndex].chestId = "SilverChest";
                }
                else {
                    //calculate what chest will occupy slot based on ChestWeightArray
                    var randVal = Math.floor(Math.random() * sumOfWeights);
                    var chestFound = "SilverChest";
                    for (var i = 0; i < chestWeightsArray.length; i++) {
                        if (Number(chestWeightsArray[i].rightRange) <= Number(randVal)) continue;
                        if (Number(chestWeightsArray[i].leftRange) > Number(randVal)) continue;
                        chestFound = chestWeightsArray[i].chestId;
                        break;
                    }
                    slotArray[slotIndex].chestId = chestFound;
                }

                slotArray[slotIndex].chestLeague = cLeague;
                slotArray[slotIndex].status = "Occupied";
                slotArray[slotIndex].orderTimeStamp = 0;
                slotArray[slotIndex].arrivalTimeStamp = 0;


            } break;
        case "endGameFreeWin":
            {
                slotArray[slotIndex].chestId = "QuickChest";
                slotArray[slotIndex].chestLeague = cLeague;
                slotArray[slotIndex].status = "Occupied";
                slotArray[slotIndex].orderTimeStamp = 0;
                slotArray[slotIndex].arrivalTimeStamp = 0;
            } break;
        case "tutorial":
            {
                slotArray[slotIndex].chestId = "QuickChest";
                slotArray[slotIndex].chestLeague = 1;
                slotArray[slotIndex].status = "Occupied";
                slotArray[slotIndex].orderTimeStamp = 0;
                slotArray[slotIndex].arrivalTimeStamp = 0;
            } break;
        default:
            {
                log.debug("unexpected source, returning from grantChest");
                return;
            }
            break;
    }

    //let's update the user's chest slot data
    var chestSlotInfoString = JSON.stringify(slotArray);
    log.debug("updating ChestSlotsStatus: " + chestSlotInfoString);
    server.UpdateUserInternalData(
    {
        PlayFabId: currentPlayerId,
        Data:
        {
            "ChestSlotsStatus": chestSlotInfoString
        }
    });

}
handlers.startGame = function (args, context) {

    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);

    //trophy count and subleague distribution
    var leagueTitleDataRequest = server.GetTitleData(
      {
          Key: ["LeagueSubdivisions", "SubdivisionTrophyRanges", "TrophyGainRange", "TrophyLoseRange", "SubdivisionPrRanges", "TrophyDifferenceLimit"]
      }
      );
    //let's get the GamesStarted statistic
    var gss = server.GetPlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        StatisticNames: ["TotalGames"]
    }).Statistics;
    var totalGamesStarted = GetValueFromStatistics(gss, "TotalGames", 0);
    totalGamesStarted = Number(totalGamesStarted) + 1;
    if (args.debug == true) log.debug("totalGamesStartedIs: " + totalGamesStarted);
    var tc = server.GetPlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        StatisticNames: ["TrophyCount"]
    });
    var trophyCount = 0;
    if (tc.Statistics.length != 0) {
        trophyCount = tc.Statistics[0].Value;
    }
    trophyCount = Number(trophyCount);
    var sdval = leagueTitleDataRequest.Data["SubdivisionTrophyRanges"];
    var sdvalParsed = JSON.parse(sdval);
    var lsVal = leagueTitleDataRequest.Data["LeagueSubdivisions"];
    var lsValParsed = JSON.parse(lsVal);
    var sdprVal = leagueTitleDataRequest.Data["SubdivisionPrRanges"];
    var sdprValParsed = JSON.parse(sdprVal);

    //trophyAdjustment data
    var tdlVal = leagueTitleDataRequest.Data["TrophyDifferenceLimit"]; //u are here
    var tdlValParsed = JSON.parse(tdlVal);
    var trophyReadjustRange = Number(tdlValParsed.trophyReadjustRange);
    var trophyMaxDifference = Number(tdlValParsed.maxDifference);
    var excludedSubdivisionsFromTrophyAdjustment = tdlValParsed.subDivisionsToExclude;
    //log.debug("SubdivisionTrophyRanges " + sdvalParsed);
    var subDivision = 43;
    var nextSubDivision = 43;
    var subDivisionRange = 200;
    var rminmaxarr = leagueTitleDataRequest.Data["TrophyGainRange"].split("_");
    var lminmaxarr = leagueTitleDataRequest.Data["TrophyLoseRange"].split("_");
    var rMin = Number(rminmaxarr[0]);
    var rMax = Number(rminmaxarr[1]);
    var lMin = Number(lminmaxarr[0]);
    var lMax = Number(lminmaxarr[1]);
    for (var i = 0; i < sdvalParsed.subdivisions.length; i++) {
        if (trophyCount < Number(sdvalParsed.subdivisions[i])) {
            subDivision = i;
            if (i < sdvalParsed.subdivisions.length - 1) nextSubDivision = i + 1;
            break;
        }
    }
    subDivisionRange = Number(sdvalParsed.subdivisions[nextSubDivision]) - Number(sdvalParsed.subdivisions[subDivision]);
    if (subDivisionRange <= 0) subDivisionRange = 400; // random 400
    //log.debug("user is in subdivision " + subDivision);

    //matchmaking code
    //let's get subdivision and neighbouring subdivisions
    var subDivKeys = ["RecSubDivision" + subDivision];
    var titleData = server.GetTitleInternalData(
      {
          Keys: "RecSubDivision" + subDivision
      }
      );
    var recPool = titleData.Data["RecSubDivision" + subDivision];
    var isIncompleteSubDivision = false;
    //log.debug("recPool " + recPool);
    if (recPool == undefined) isIncompleteSubDivision = true;
    var recArray;
    var opponentId;
    var env;
    var course;

    //previous opponents + win status
    var oppPrev = "noop"; // ultimu
    var oppPrevPrev = "noop";// penultimu
    var oppArray;
    var oppDat = server.GetUserInternalData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["lastOpp", "quitLastGame"]
    });
    var didQuitLastGame = "false;"
    if (oppDat.Data.quitLastGame != undefined)
        didQuitLastGame = oppDat.Data.quitLastGame.Value;
    //if(args.debug == true) log.debug("didQuitLastGame: " + didQuitLastGame);
    var setLastGameToLossFlag = false;
    if (didQuitLastGame == undefined) didQuitLastGame = "false";
    if (didQuitLastGame == "true") {
        //user quit so we have to set his last game to a loss
        setLastGameToLossFlag = true; //urhereson
    }
    if ((oppDat.Data == undefined) || (oppDat.Data.lastOpp == undefined)) {
        //log.debug("opp data is undefined");
        oppPrev = "noop";
        oppPrevPrev = "noop";
    }
    else {
        oppArray = oppDat.Data.lastOpp.Value.split(",");
        // log.debug("oppArray is " + oppArray);
        for (var i = 0; i < oppArray.length; i++) {
            if (i == 0) oppPrev = oppArray[i];
            if (i == 1) oppPrevPrev = oppArray[i];
        }
        // log.debug("oppPrev is " + oppPrev);
        // log.debug("oppPrevPrev is " + oppPrevPrev);
    }
    if (isIncompleteSubDivision == false) {
        recArray = JSON.parse(recPool);
        opponentId = recArray[recArray.length - 1].uId;
        env = recArray[recArray.length - 1].e;
        course = recArray[recArray.length - 1].c;
    }
    else {
        recArray = [];
    }

    //default recording code
    var subDivisionLength = 30; // we have 25 possible courses
    var envCourseArray =
    [
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0
    ]
    //log.debug("subrecording pool has " + recArray.length + " length. Must have: " + subDivisionLength + " length");

    if (recArray.length < subDivisionLength) isIncompleteSubDivision = true;

    var validRecArray = new Array(recArray.length); // all recordings except yours
    var vrAidx = 0;
    var likelyRecArray = new Array(recArray.length); // all recordings minus yours AND minus oppPrev
    var lrAidx = 0;
    var moreLikelyRecArray = new Array(recArray.length); // all recordings minus yours AND minus oppPrev AND minus oppPrevPrev
    var mlrAidx = 0;
    //log.debug("iterating through recArray");
    for (var i = 0; i < recArray.length; i++) // create valid rec pool OR check for missing env/course if subDivision has missing recordings
    {
        if (isIncompleteSubDivision == true) {
            envCourseArray[Number(recArray[i].e) * 5 + Number(recArray[i].c)] = 1;
        }
        if (recArray[i].uId == currentPlayerId) {
            // log.debug("found: " + recArray[i].uId + "... skipping");
            continue;
        }
        validRecArray[vrAidx] = recArray[i];
        vrAidx++;
        if (recArray[i].uId == oppPrev) {
            // log.debug("found: " + recArray[i].uId + "... skipping prev opp");
            continue;
        }
        likelyRecArray[lrAidx] = recArray[i];
        lrAidx++;
        if (recArray[i].uId == oppPrevPrev) {
            // log.debug("found: " + recArray[i].uId + "... skipping prev prev opp");
            continue;
        }
        moreLikelyRecArray[mlrAidx] = recArray[i];
        mlrAidx++;
    }
    //log.debug("isIncompleteSubDivision: " + isIncompleteSubDivision);
    //let's give default recording if necessary
    if (isIncompleteSubDivision == true) {
        var envToGet = 0;
        var courseToGet = 0;
        var recordlessTracks = [];

        for (var i = 0; i < envCourseArray.length; i++) {
            if (envCourseArray[i] == 0)// we found a missing recording <- e = i/5; c = i%5;
            {
                recordlessTracks.push(i);
            }
        }

        var courseIndexMissing = recordlessTracks[Math.floor(Math.random() * recordlessTracks.length)];
        envToGet = Math.floor(courseIndexMissing / 5);
        courseToGet = courseIndexMissing % 5;

        //log.debug("gettingDefaultUser: env: " + envToGet + " course: " + courseToGet);
        //let's see who the master account is
        var masterAccountRequest = server.GetTitleData(
        {
            Keys: "MasterUser"
        }
        );
        if (masterAccountRequest.Data["MasterUser"] != undefined) {
            // log.debug("master user: " + masterAccountRequest.Data["MasterUser"]);
            var defaultRecordingData = server.GetUserReadOnlyData(
            {
                PlayFabId: masterAccountRequest.Data["MasterUser"],
                Keys: [(envToGet + "_" + courseToGet + "_RecPos"), (envToGet + "_" + courseToGet + "_RecRot"), (envToGet + "_" + courseToGet + "_RecHeader")]
            }
            );
            if (defaultRecordingData.Data != undefined) {
                //log.debug("defaultRecordingData: " + defaultRecordingData.Data);
                if ((defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecPos"] != undefined) && (defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecRot"] != undefined) && (defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecHeader"] != undefined)) { // looks like we found a valid default recording
                    var updateTrophyInternal = true;
                    if (trophyCount == 0) {
                        //this is the tutorial condition
                        //let's give your player a chest. THIS ONLY HAPPENS ONCE
                        grantUserChest(currentPlayerId, "tutorial");
                        trophyCount = rMax;
                        updateTrophyInternal = false;
                    }
                    else {
                        trophyCount -= lMin;
                    }
                    if (trophyCount <= 1) trophyCount = 1;
                    //wlStatInt = parseInt(wlStat, 2);

                    //log.debug("updating WL to:  " + wlStatInt);
                    //update stats on server
                    var suArray = [];
                    //var su = {StatisticName: "WinLoss", Version : "0", Value: wlStatInt};
                    //suArray.push(su);
                    var sut = { StatisticName: "TrophyCount", Value: trophyCount };
                    suArray.push(sut);
                    var sul = { StatisticName: "League", Value: cLeague };
                    suArray.push(sul);
                    var sul = { StatisticName: "TotalGames", Value: totalGamesStarted };
                    suArray.push(sul);
                    //log.debug("updatingStats: " + suArray);
                    var updateRequest = server.UpdatePlayerStatistics(
                    {
                        PlayFabId: currentPlayerId,
                        Statistics: suArray
                    }
                    );

                    var trophiesOnWin = Math.floor((Number(rMax) + Number(rMin)) / 2);
                    var trophiesOnLose = Math.floor((Number(lMax) + Number(lMin)) / 2);

                    var dataToUpdate = {
                        "trophyWin": trophiesOnWin,
                        "trophyLose": trophiesOnLose,
                        "quitLastGame": "true",
                    }

                    if (updateTrophyInternal == false) {
                        dataToUpdate["trophyWin"] = 0;
                        dataToUpdate["trophyLose"] = 0;
                    }
                    if (setLastGameToLossFlag == true)//urhere
                    {
                        dataToUpdate["LastGameOutcome"] = "Loss";
                    }
                    server.UpdateUserInternalData(
                    {
                        PlayFabId: currentPlayerId,
                        Data: dataToUpdate
                    });
                    //log.debug("found valid default rec");
                    return {
                        Result: "OK",
                        RecType: "TheStig",
                        PosData: defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecPos"].Value, //0_0_RecPos
                        RotData: defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecRot"].Value,
                        HeaderData: defaultRecordingData.Data[envToGet + "_" + courseToGet + "_RecHeader"].Value,
                        TrophyLose: lMin,
                        TrophyWin: rMax,
                        Opp: "TheStig",
                        PicTexture: null
                    };
                }
            }
        }
    }
    //log.debug("looking for user generated recording");
    if (vrAidx == 0) return generateErrObj("no valid recording found for this subdivision");

    //we have 3 arrays. We want the likelyhood that you get the same previous opponents to be as low as possible
    //so we will see if moreLikelyRecArray is empty. If yes we check if likelyRecArray is empty.
    //if they are both empty we remain with the current validRecArray array
    var searchArray = validRecArray;
    var sAlen = vrAidx;
    if (lrAidx > 0) { sAlen = lrAidx; searchArray = likelyRecArray }
    if (mlrAidx > 0) { sAlen = mlrAidx; searchArray = moreLikelyRecArray }
    var pivot = Math.floor(Math.random() * sAlen);
    if (pivot >= sAlen) pivot = sAlen - 1; //i'm not fully sure Math.random can't give a value of 1 DON'T JUDGE ME
    //legacy WINLOSS RATIO mathcmaking
    //var pivot = sAlen - 1; //in case your WLRatio is the highest in the pool
    //for(var i = 0; i < sAlen; i++) // write winstreak/losestreak code
    //{
    //  if(searchArray[i].wl > winRatio) //let's find the pivot; we'll move it later based on WL ratio
    //  {
    //    pivot = i;
    //    break;
    // }
    //}
    // log.debug("pivot is: " + pivot);
    var finalRecArraySize = Math.min(sAlen, 3); // for now 3 is the max number of recordings in the random final pool
    // log.debug("finalRecArraySize: " + finalRecArraySize);
    var finalRecArray = new Array(finalRecArraySize); // this array will be populated with the recordings around the pivot
    for (var i = 0; i < finalRecArraySize; i++) {
        if (pivot <= 0) // get rightmost recordings
        {
            finalRecArray[i] = searchArray[i];
            continue;
        }
        if (pivot >= sAlen - 1) // get leftmost recordings
        {
            finalRecArray[i] = searchArray[sAlen - 1 - i];
            continue;
        }
        finalRecArray[i] = searchArray[(pivot - Math.floor(finalRecArraySize / 2) + i)]; // get inner recordings
    }
    var randIdx = Math.floor(Math.random() * finalRecArraySize); // let's get a random one from this final pool
    opponentId = finalRecArray[randIdx].uId;
    env = finalRecArray[randIdx].e;
    course = finalRecArray[randIdx].c;
    var urodkr = [(env + "_" + course + "_RecPos"), (env + "_" + course + "_RecRot"), (env + "_" + course + "_RecHeader")];
    // log.debug("requesting " + urodkr);
    var recordingData = server.GetUserReadOnlyData(
      {
          PlayFabId: opponentId,
          Keys: urodkr
      }
      );
    if (recordingData == undefined) return generateErrObj("Did not find recording for this user: " + opponentId); // handle this later
    //end matchmaking

    var oI = server.GetPlayerCombinedInfo(
      {
          PlayFabId: opponentId,
          InfoRequestParameters: { "GetUserAccountInfo": true, "GetUserInventory": false, "GetUserVirtualCurrency": false, "GetUserData": false, "GetUserReadOnlyData": false, "GetCharacterInventories": false, "GetCharacterList": false, "GetTitleData": false, "GetPlayerStatistics": false }
      }
      );

    var oppTexture = server.GetUserData(
    {
        PlayFabId: opponentId,
        Keys: ["PicTexture"]
    }).Data.PicTexture;
    if (oppTexture == undefined) oppTexture = null;
    else oppTexture = oppTexture.Value;
    //found recording now let's reduce user's trophies
    //let's extract opponent trophies so we know how muany trophies we give/takeaway from user
    var trophiesToTake = 15; // min
    var trophiesToGive = 30; // max
    var userTrophies = trophyCount;
    var oppTrophies;
    var cLeague = Number(calculateLeague(trophyCount));
    var recTypeSent = "UserGenerated";
    //log.debug("cLeague " + cLeague);
    //        log.debug("lsValParsed: " + lsValParsed);
    //        log.debug("sdvalParsed: " + sdvalParsed);
    //        log.debug("lsValParsed.leagues: " + lsValParsed.leagues);
    //        log.debug("sdvalParsed.subDivisions: " + sdvalParsed.subdivisions);

    var minLeagueT
    if (cLeague > 0)
        minLeagueT = Number(sdvalParsed.subdivisions[lsValParsed.leagues[cLeague - 1]]);
    else
        minLeagueT = 0;

    var maxLeagueT;
    if (cLeague >= lsValParsed.leagues.length - 1)
        maxLeagueT = minLeagueT * 2;
    else
        maxLeagueT = Number(sdvalParsed.subdivisions[lsValParsed.leagues[cLeague]]);

    //log.debug("maxLT " + maxLeagueT + " minLeagueT " + minLeagueT);
    if (args.debug == true) log.debug("I bet it will crash after this");
    var opponentHeader = JSON.parse(recordingData.Data[env + "_" + course + "_RecHeader"].Value);
    if (args.debug == true) log.debug("or not");
    if (opponentHeader != undefined) {
        oppTrophies = opponentHeader.Trophies;
    }
    oppTrophies = Number(oppTrophies);
    var trophyAdjustmentRequired = true;
    //let's adjust said trophies if needed and modify the header
    if (args.debug == true) log.debug("Adjusting trophies");

    if (excludedSubdivisionsFromTrophyAdjustment != undefined) {
        if (args.debug == true) log.debug("excludedSubdivisionsFromTrophyAdjustment: " + excludedSubdivisionsFromTrophyAdjustment);
        for (var i = 0; i < excludedSubdivisionsFromTrophyAdjustment.length; i++) {
            if (subDivision == Number(excludedSubdivisionsFromTrophyAdjustment[i])) {
                if (args.debug == true) log.debug("in excluded subdivision: " + subDivision);
                trophyAdjustmentRequired = false;
                break;
            }
        }
    }
    if (trophyAdjustmentRequired == true) {
        if (Number(Math.abs(userTrophies - oppTrophies)) >= trophyMaxDifference) {
            if (args.debug == true) log.debug("generating new trophies. Reason: user trophies: " + userTrophies + " vs opponent trophies: " + oppTrophies);
            oppTrophies = userTrophies - trophyReadjustRange + Math.floor(Math.random() * trophyReadjustRange * 2);
            opponentHeader.Trophies = oppTrophies;
            if (args.debug == true) log.debug("performing stringify on recordingData header");
            recordingData.Data[env + "_" + course + "_RecHeader"].Value = JSON.stringify(opponentHeader); //hope this works

        }
    }
    //end trophy adjustments

    if (maxLeagueT - minLeagueT <= 0) {
        trophiesToTake = lMax;
        trophiesToGive = rMin;
    }
    else {
        if (Number(Math.abs(userTrophies - oppTrophies)) > Number(subDivisionRange)) {
            trophiesToTake = Math.floor((lMin + lMax) / 2) - 1 + Math.floor(Math.random() * 3);
            trophiesToGive = Math.floor((rMax + rMin) / 2) - 1 + Math.floor(Math.random() * 3);
            //recTypeSent = "MobyDick"; // the difference in trophies is too damn high. Tell the client to generate a more appropriate opponent
        }
        else {
            //  log.debug("rMin: " + rMin + " userTrophies: " + userTrophies + " oppTrophies " + oppTrophies + " maxLeagueT " + maxLeagueT + " minLeagueT " + minLeagueT + " rMax: " + rMax);
            trophiesToTake = lMin + Math.floor((((userTrophies - oppTrophies) / (maxLeagueT - minLeagueT)) + 1) * ((lMax - lMin) / 2));
            trophiesToGive = rMin + Math.floor((((oppTrophies - userTrophies) / (maxLeagueT - minLeagueT)) + 1) * ((rMax - rMin) / 2));
        }
    }
    //let's also check if the opponent's Pr is in the appropriate range
    if (args.debug == true) log.debug("Opponent's PR is TOO DAMN HIGH! " + opponentHeader.Pr + " vs " + Number(sdprValParsed.subdivisions[Number(lsValParsed.leagues[cLeague - 1]) + 1]) + ". You are in subdivision: " + Number((lsValParsed.leagues[cLeague - 1]) + 1));
    if (opponentHeader.Pr > Number(sdprValParsed.subdivisions[Number(lsValParsed.leagues[cLeague - 1]) + 1])) {
        //log.debug("Opponent's PR is TOO DAMN HIGH! " + opponentHeader.Pr + " vs " + Number(sdprValParsed.subdivisions[lsValParsed.leagues[cLeague - 1] + 1]) + ". You are in subdivision: " + lsValParsed.leagues[cLeague - 1] + 1);
        trophiesToTake = Math.floor((lMin + lMax) / 2) - 1 + Math.floor(Math.random() * 3);
        trophiesToGive = Math.floor((rMax + rMin) / 2) - 1 + Math.floor(Math.random() * 3);
        recTypeSent = "MobyDick"; // the difference in Pr is too damn high. Tell the client to generate a more appropriate opponent
    }
    var updateTrophiesToGiveTake = true;
    if (trophyCount == 0) {
        //this is the tutorialCondition
        //let's give your player a chest. THIS ONLY HAPPENS ONCE
        grantUserChest(currentPlayerId, "tutorial");
        updateTrophiesToGiveTake = false;
        trophyCount = rMax;
    }
    else {
        trophyCount -= Number(trophiesToTake);
        if (trophyCount <= 1) trophyCount = 1;
    }
    //log.debug("trophiesToTake:  " + trophiesToTake);
    // log.debug("trophiesToGive:  " + trophiesToGive);
    //wlStatInt = parseInt(wlStat, 2);
    // log.debug("updating WL to:  " + wlStatInt);
    //update stats on server
    var suArray = [];
    //var su = {StatisticName: "WinLoss", Version : "0", Value: wlStatInt};
    //suArray.push(su);
    var sut = { StatisticName: "TrophyCount", Value: trophyCount };
    suArray.push(sut);
    var sul = { StatisticName: "League", Value: cLeague };
    suArray.push(sul);
    var sul = { StatisticName: "TotalGames", Value: totalGamesStarted };
    suArray.push(sul);
    // log.debug("updatingStats: " + suArray);
    var updateRequest = server.UpdatePlayerStatistics(
    {
        PlayFabId: currentPlayerId,
        Statistics: suArray
    }
    );
    var lastOppVal = opponentId + "," + oppPrev;
    var dataToUpdate = {
        "trophyWin": trophiesToGive,
        "trophyLose": trophiesToTake,
        "lastOpp": lastOppVal,
        "quitLastGame": "true",
    }
    if (updateTrophiesToGiveTake == false) {
        dataToUpdate["trophyWin"] = 0;
        dataToUpdate["trophyLose"] = 0;
    }
    if (setLastGameToLossFlag == true)//urhere
    {
        dataToUpdate["LastGameOutcome"] = "Loss";
    }
    server.UpdateUserInternalData(
    {
        PlayFabId: currentPlayerId,
        Data: dataToUpdate
    });


    return {
        Result: "OK",
        RecType: recTypeSent,
        PosData: recordingData.Data[env + "_" + course + "_RecPos"].Value, //0_0_RecPos
        RotData: recordingData.Data[env + "_" + course + "_RecRot"].Value,
        HeaderData: recordingData.Data[env + "_" + course + "_RecHeader"].Value,
        TrophyLose: trophiesToTake,
        TrophyWin: trophiesToGive,
        Opp: oI.InfoResultPayload.AccountInfo.TitleInfo.DisplayName,
        PicTexture: oppTexture
    };
}
handlers.updateCarCust = function (args, context) {
    var mC = CheckMaintenanceAndVersion(args);
    if (mC != "OK") return generateMaintenanceOrUpdateObj(mC);
    var userInv = server.GetUserInventory(
    {
        PlayFabId: currentPlayerId,
    }
    );
    var itemsToGive = [];
    var carFound = "-1";
    var DataToUpdate = {};
    var customizations = {
        PaintJobs: { itemOwned: "no", itemCustData: args.paintId, carItemId: "PaintId" },
        Decals: { itemOwned: "no", itemCustData: args.decalId, carItemId: "DecalId" },
        Plates: { itemOwned: "no", itemCustData: args.platesId, carItemId: "PlatesId" },
        Rims: { itemOwned: "no", itemCustData: args.rimsId, carItemId: "RimsId" },
        WindshieldText: { itemOwned: "no", itemCustData: args.wsId, carItemId: "WindshieldId" }
    };

    for (var i = 0; i < userInv.Inventory.length; i++) {
        if ((userInv.Inventory[i].ItemId == args.carId) && (userInv.Inventory[i].CatalogVersion == "CarsProgress")) {
            carFound = userInv.Inventory[i].ItemInstanceId;
        }
        if (userInv.Inventory[i].ItemId in customizations) {
            customizations[userInv.Inventory[i].ItemId].itemOwned = "yes";
            if (customizations[userInv.Inventory[i].ItemId].itemCustData in userInv.Inventory[i].CustomData) {
                DataToUpdate[customizations[userInv.Inventory[i].ItemId].carItemId] = customizations[userInv.Inventory[i].ItemId].itemCustData;
            }
            else {
                log.debug("user doesn't own: " + userInv.Inventory[i].ItemId + " " + customizations[userInv.Inventory[i].ItemId].itemCustData);
            }
        }
    }
    if (carFound == "-1") {
        return generateFailObj("User does not own car with id: " + args.carId);
    }
    //give inventory
    for (var prop in customizations) {
        if (customizations.hasOwnProperty(prop)) {
            if (customizations[prop].itemOwned == "no") {
                itemsToGive.push(prop);
            }
        }
    }

    if (DataToUpdate == {}) return generateFailObj("User doesn't own any of those customizations");
    var updatedItem = server.UpdateUserInventoryItemCustomData(
       {
           PlayFabId: currentPlayerId,
           ItemInstanceId: carFound,
           Data: DataToUpdate
       }
       );

    //let's update user's UserInfoData
    updateProfileCar(args, context, currentPlayerId);

    var objectsUpdated =
    [
    {
        ItemId: args.carId,
        CatalogVersion: "CarsProgress",
        CustomData: DataToUpdate
    }
    ];
    if (itemsToGive.length > 0) {
        var grantRequest = server.GrantItemsToUser(
        {
            CatalogVersion: "Customization",
            PlayFabId: currentPlayerId,
            ItemIds: itemsToGive
        }
        );

        var InvData = {
            0: "Owned"
        };

        for (var i = 0; i < grantRequest.ItemGrantResults.length; i++) {
            server.UpdateUserInventoryItemCustomData(
                 {
                     PlayFabId: currentPlayerId,
                     ItemInstanceId: grantRequest.ItemGrantResults[i].ItemInstanceId,
                     Data: InvData
                 }
                 );
        }
    }
    var invChangeObj =
        {
            Inventory: objectsUpdated
        };
    var returnObj = {
        Result: "OK",
        Message: "InventoryUpdate",
        InventoryChange: invChangeObj
    };

    return returnObj;

};
function upgradeCar(args, context, userInventoryObject, playerSC, playerHC) {
    var carCardsCatalog = server.GetCatalogItems(
      {
          CatalogVersion: "CarCards"
      }
    );

    var carFound = false;
    var car;
    for (var i = 0; i < userInventoryObject.Inventory.length; i++) {
        if ((userInventoryObject.Inventory[i].ItemId == args.carId) && (userInventoryObject.Inventory[i].CatalogVersion == "CarsProgress")) {
            carFound = true;
            //log.debug("car is in user's inventory!");
            car = userInventoryObject.Inventory[i];
            break;
        }
    }
    var cardInfo;
    for (i = 0; i < carCardsCatalog.Catalog.length; i++) {
        if (carCardsCatalog.Catalog[i].ItemId == args.carId) {
            cardInfo = JSON.parse(carCardsCatalog.Catalog[i].CustomData);
            //log.debug("cardInfo found!");
            break;
        }
    }

    if (cardInfo === undefined)
        return generateErrObj("CardNotFoundForCarwithID: " + args.carId + ". It is possible that the carCard ID and the Car ID do not coincide. Check Playfab catalog data.");

    if (carFound === true) {
        //test if maximum pr level was reached
        var newLvl = (parseInt(car.CustomData.CarLvl) + 1);
        if (newLvl >= Number(cardInfo.prPerLvl.length))
            return generateFailObj("Maximum pr level was reached!");

        var currCost = getObjectValueFromLevel(cardInfo, "currCostPerLvl", newLvl);
        var costCheckObj = checkBalance(cardInfo.currType, currCost, playerSC, playerHC);
        if (costCheckObj != "OK") return costCheckObj;


        //log.debug("user has enough currency. Let's check for card balance");

        var cardCost = getObjectValueFromLevel(cardInfo, "cardCostPerLvl", newLvl);
        car.CustomData.CarLvl = newLvl;
        // log.debug("cardCost: " + cardCost);
        var cardFound = false;
        var cardData;
        for (i = 0; i < userInventoryObject.Inventory.length; i++) {
            if ((userInventoryObject.Inventory[i].ItemId == args.carId) && (userInventoryObject.Inventory[i].CatalogVersion == "CarCards")) {
                // log.debug("consuming: " + userInventoryObject.Inventory[i].ItemInstanceId);
                cardFound = true;
                try {
                    if (userInventoryObject.Inventory[i].CustomData === undefined)//let's check if item has custom data
                    {
                        return generateFailObj("Insufficient cards, CusotmData undefined");
                    }
                    else {
                        if (userInventoryObject.Inventory[i].CustomData.Amount === undefined)//let's check if item has amount custom data
                        {
                            return generateFailObj("Insufficient cards, CusotmData.Amount udnefined");
                        }
                        else // let's check and see if the user has sufficent cards
                        {
                            if (Number(userInventoryObject.Inventory[i].CustomData.Amount) >= cardCost) // he does so let's remove the appropriate amount
                            {
                                userInventoryObject.Inventory[i].CustomData.Amount -= cardCost;
                                cardData = { "Amount": userInventoryObject.Inventory[i].CustomData.Amount };
                                server.UpdateUserInventoryItemCustomData(
                                  {
                                      PlayFabId: currentPlayerId,
                                      ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
                                      Data: cardData
                                  }
                                );
                            }
                            else {
                                return generateFailObj("Insufficient cards for real: " + userInventoryObject.Inventory[i].CustomData.Amount + " vs " + cardCost);
                            }
                        }
                    }
                }
                catch (err) {
                    //log.debug("itemConsumptionResult.errorCode " + err);
                    return generateFailObj("Insufficient cards");
                }
                break;
            }
        }

        if (cardFound === false) {
            return generateFailObj("No cards found");
        }
        // log.debug("user has enough cards to purchase upgrade!");

        var newPr = recalculateCarPr(car.CustomData, car.ItemId, carCardsCatalog, undefined);
        // log.debug("upgrading to car lvl: " +  newLvl + " and pr: " + newPr);
        var CarData = {
            "CarLvl": newLvl,
            "Pr": newPr
        };
        server.UpdateUserInventoryItemCustomData(
          {
              PlayFabId: currentPlayerId,
              ItemInstanceId: car.ItemInstanceId,
              Data: CarData
          }
        );

        //let's udpate our profile
        updateProfileCar(args, context, currentPlayerId);

        var subtractUserCurrencyResult;
        if (currCost > 0) {
            subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
              {
                  PlayFabId: currentPlayerId,
                  VirtualCurrency: cardInfo.currType,
                  Amount: currCost
              }
            );
            updateCurrencySpentStatistic(cardInfo.currType, currCost);
        }
        // log.debug("Upgrade Complete!");

        var objectsUpdated =
        [
          {
              ItemId: args.carId,
              CatalogVersion: "CarCards",
              CustomData: cardData
          },
          {
              ItemId: args.carId,
              CatalogVersion: "CarsProgress",
              CustomData: CarData
          }
        ];

        var currencyUpdated = {};
        var i =
        {
            Inventory: objectsUpdated
        }
        if (subtractUserCurrencyResult != undefined) {
            currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
            i.VirtualCurrency = currencyUpdated;
        }

        i.Experience = UpdateExperience("Balancing", "BalancingItem", "Car_" + cardInfo.rarity, newLvl, true);
        return generateInventoryChange("InventoryUpdate", i);
    }
    else {
        // log.debug("user doesn't have car: " +  args.carId + "... looking for card");
        var cardFound = false;
        var cardData;
        var carCardInstance;
        for (var i = 0; i < userInventoryObject.Inventory.length; i++) {
            if ((userInventoryObject.Inventory[i].ItemId == args.carId) && (userInventoryObject.Inventory[i].CatalogVersion == "CarCards")) {
                //log.debug("consuming: " + userInventoryObject.Inventory[i].ItemInstanceId);
                cardFound = true;
                try {
                    if (userInventoryObject.Inventory[i].CustomData === undefined)//let's check if item has custom data
                    {
                        return generateFailObj("Insufficient cards, CustomData null");
                    }
                    else {
                        if (userInventoryObject.Inventory[i].CustomData.Amount === undefined)//let's check if item has amount custom data
                        {
                            return generateFailObj("Insufficient cards, CustomData.Amount null");
                        }
                        else // let's check and see if the user has sufficent cards
                        {
                            if (Number(userInventoryObject.Inventory[i].CustomData.Amount) >= Number(cardInfo.cardCostPerLvl[1])) // he does so let's remove the appropriate amount
                            {
                                carCardInstance = userInventoryObject.Inventory[i].ItemInstanceId;
                                userInventoryObject.Inventory[i].CustomData.Amount -= cardInfo.cardCostPerLvl[1];
                                cardData = { "Amount": userInventoryObject.Inventory[i].CustomData.Amount };
                            }
                            else {
                                return generateFailObj("Insufficient cards: " + userInventoryObject.Inventory[i].CustomData.Amount + " vs " + cardInfo.cardCostPerLvl[1] + ".");
                            }
                        }
                    }
                }
                catch (err) {
                    return generateFailObj("Insufficient cards: " + err);
                }
                break;
            }
        }

        if (cardFound == false) {
            return generateFailObj("No cards found");
        }

        //log.debug("user has enough cards to purchase car. Checking if enough currency is availabe");

        var costCheckObj = checkBalance(cardInfo.currType, cardInfo.currCostPerLvl[1], playerSC, playerHC);
        if (costCheckObj != "OK") return costCheckObj;

        var itemsToGive = [];
        itemsToGive.push(args.carId);

        var carToGive = server.GrantItemsToUser(
          {
              CatalogVersion: "CarsProgress",
              PlayFabId: currentPlayerId,
              ItemIds: itemsToGive
          }
        );

        if (carToGive.ItemGrantResults[0].Result === false) {
            log.error("Something went wrong while giving user the item, refunding cards");
            //new refund code
            return generateFailObj("Something went wrong while giving user the item, refunding cards.");
        }
        else {
            server.UpdateUserInventoryItemCustomData(
              {
                  PlayFabId: currentPlayerId,
                  ItemInstanceId: carCardInstance,
                  Data: cardData
              }
            );
        }
        var subtractUserCurrencyResult;
        if (cardInfo.currCostPerLvl[1] > 0) {
            subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
              {
                  PlayFabId: currentPlayerId,
                  VirtualCurrency: cardInfo.currType,
                  Amount: cardInfo.currCostPerLvl[1]
              }
            );
            updateCurrencySpentStatistic(cardInfo.currType, cardInfo.currCostPerLvl[1]);
        }

        var CarData = {
            "CarLvl": "1",
            "EngineLvl": "0",
            "ExhaustLvl": "0",
            "GearboxLvl": "0",
            "SuspensionLvl": "0"
        };

        server.UpdateUserInventoryItemCustomData(
          {
              PlayFabId: currentPlayerId,
              ItemInstanceId: carToGive.ItemGrantResults[0].ItemInstanceId,
              Data: CarData
          }
        );
        CarData = {
            "TiresLvl": "0",
            "TurboLvl": "0",
            "PaintId": cardInfo.defaultPaintID,
            "DecalId": "0",
            "RimsId": "0"
        };
        server.UpdateUserInventoryItemCustomData(
          {
              PlayFabId: currentPlayerId,
              ItemInstanceId: carToGive.ItemGrantResults[0].ItemInstanceId,
              Data: CarData
          }
        );
        CarData = {
            "PlatesId": "0",
            "WindshieldId": "0",
            "Pr": (Number(cardInfo.basePr) + cardInfo.prPerLvl[1])
        };

        server.UpdateUserInventoryItemCustomData(
          {
              PlayFabId: currentPlayerId,
              ItemInstanceId: carToGive.ItemGrantResults[0].ItemInstanceId,
              Data: CarData
          }
        );
        //if user doesn't have this paint job we give it to him/her
        var hasPaintJob = false;
        var hasPaintJobItem = false;
        var paintData;
        for (var i = 0; i < userInventoryObject.Inventory.length; i++) {
            if (userInventoryObject.Inventory[i].ItemId == "PaintJobs") {
                hasPaintJobItem = true;
                //log.debug("user has paintjobs");
                if (userInventoryObject.Inventory[i].CustomData != undefined) {
                    // log.debug("user has paintjobs customData");
                    if (cardInfo.defaultPaintID in userInventoryObject.Inventory[i].CustomData) {
                        //log.debug("user has paintjob already");
                        hasPaintJob = true;
                    }
                    else {
                        // log.debug("user doesn't have paintjob");
                        paintData = {}
                        paintData[cardInfo.defaultPaintID] = "Owned";
                    }
                }
                else // userInventoryObject.Inventory[i].CustomData == undefined
                {
                    paintData = {}
                    paintData[cardInfo.defaultPaintID] = "Owned";
                }
                if (paintData != undefined) {
                    server.UpdateUserInventoryItemCustomData(
                      {
                          PlayFabId: currentPlayerId,
                          ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
                          Data: paintData
                      }
                    );
                }
                break;
            }//end if "PaintJobs"
        }//end for

        if (hasPaintJobItem == false) {
            paintToGive = [];
            paintToGive.push("PaintJobs");
            var custToGive = server.GrantItemsToUser(
              {
                  CatalogVersion: "Customization",
                  PlayFabId: currentPlayerId,
                  ItemIds: paintToGive
              }
            );

            var paintData = {};
            paintData[cardInfo.defaultPaintID] = "Owned";
            server.UpdateUserInventoryItemCustomData(
              {
                  PlayFabId: currentPlayerId,
                  ItemInstanceId: custToGive.ItemGrantResults[0].ItemInstanceId,
                  Data: paintData
              }
            );

        }

        //create function result object for new car
        CarData = {
            "CarLvl": "1",
            "EngineLvl": "0",
            "ExhaustLvl": "0",
            "GearboxLvl": "0",
            "SuspensionLvl": "0",
            "TiresLvl": "0",
            "TurboLvl": "0",
            "PaintId": cardInfo.defaultPaintID,
            "DecalId": "0",
            "RimsId": "0",
            "PlatesId": "0",
            "WindshieldId": "0",
            "Pr": Number(cardInfo.basePr) + cardInfo.prPerLvl[1]
        };
        var objectsUpdated =
        [
          {
              ItemId: args.carId,
              CatalogVersion: "CarCards",
              CustomData: cardData
          },
          {
              ItemId: args.carId,
              CatalogVersion: "CarsProgress",
              CustomData: CarData
          }
        ];

        if (hasPaintJob == false) {
            var paintDataUpdateObj = {};
            paintDataUpdateObj[cardInfo.defaultPaintID] = "Owned";
            var pObj =
            {
                ItemId: "PaintJobs",
                CatalogVersion: "Customization",
                CustomData: paintDataUpdateObj
            }
            objectsUpdated.push(pObj);
        }

        var currencyUpdated = {};

        i =
        {
            Inventory: objectsUpdated
        }
        if (subtractUserCurrencyResult != undefined) {
            currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
            i.VirtualCurrency = currencyUpdated;
        }

        //let's udpate our profile
        updateProfileCar(args, context, currentPlayerId);

        i.Experience = UpdateExperience("Balancing", "BalancingItem", "Car_" + cardInfo.rarity, 1, true);
        return generateInventoryChange("InventoryUpdateNewCar", i);
    }
}
function upgradePart(args, context, userInventoryObject, playerSC, playerHC) {
    var carCatalog = server.GetCatalogItems(
      {
          CatalogVersion: "CarsProgress"
      }
    );

    var carExists = false;
    for (var i = 0; i < carCatalog.Catalog.length; i++) {
        if (carCatalog.Catalog[i].ItemId == args.carId) {
            carExists = true;
            break;
        }
    }

    if (carExists === false)
        return generateErrObj("car with ID: " + args.carId + " not found in catalog.");

    // log.debug("Checking to see if part exists in catalog");
    var partsCatalog = server.GetCatalogItems(
      {
          CatalogVersion: "PartCards"
      }
    );

    var partExists = false;
    var cardInfo;
    for (var i = 0; i < partsCatalog.Catalog.length; i++) {
        if (partsCatalog.Catalog[i].ItemId == args.partId) {
            cardInfo = JSON.parse(partsCatalog.Catalog[i].CustomData);
            partExists = true;
            break;
        }
    }


    if (partExists == false)
        return generateErrObj("part with ID: " + args.partId + " not found in catalog.");

    //log.debug("Checking to see if user has car: " + args.carId);
    var carFound = false;
    var car;
    for (var i = 0; i < userInventoryObject.Inventory.length; i++) {
        if ((userInventoryObject.Inventory[i].ItemId == args.carId) && (userInventoryObject.Inventory[i].CatalogVersion == "CarsProgress")) {
            carFound = true;
            //log.debug("car is in user's inventory!");
            car = userInventoryObject.Inventory[i];
            break;
        }
    }

    if (carFound === false) {
        return generateFailObj("car with ID: " + args.carId + " not found in user inventory.");
    }
    // log.debug("Checking to see if user has part and or has enough parts");
    var partFound = false;
    var part;
    var newlvl = 0;
    var CarDataToBeUpdated = {};
    for (i = 0; i < userInventoryObject.Inventory.length; i++) {
        if ((userInventoryObject.Inventory[i].ItemId == args.partId) && (userInventoryObject.Inventory[i].CatalogVersion == "PartCards")) {
            partFound = true;
            //log.debug("part is in user's inventory!");
            part = userInventoryObject.Inventory[i];
            var tempDict =
            {
                Exhaust: "ExhaustLvl",
                Engine: "EngineLvl",
                Gearbox: "GearboxLvl",
                Suspension: "SuspensionLvl",
                Tires: "TiresLvl",
                Turbo: "TurboLvl"
            };

            newlvl = parseInt(car.CustomData[tempDict[args.partId]]) + 1;

            //test if maximum pr level was reached
            if (newlvl >= Number(cardInfo.prPerLvl.length))
                return generateFailObj("Maximum pr level was reached!");

            var partsRequired = getObjectValueFromLevel(cardInfo, "cardCostPerLvl", newlvl);
            var currCost = getObjectValueFromLevel(cardInfo, "currCostPerLvl", newlvl);

            CarDataToBeUpdated[tempDict[args.partId]] = newlvl;
            car.CustomData[tempDict[args.partId]] = newlvl;
            // log.debug("we need: " + partsRequired + " cards and " + currCost + " money => base: " + parseInt(cardInfo.baseCurrCost) + " lvls: " + parseInt(car.CustomData[tempDict[args.partId]]) + " perLvlCost: " + parseInt(cardInfo.currCostPerLvl) + " equalling: "  + ((parseInt(car.CustomData[tempDict[args.partId]], 10) * parseInt(cardInfo.currCostPerLvl, 10))));
            var updateCardData;
            var costCheckObj = checkBalance(cardInfo.currType, currCost, playerSC, playerHC);
            if (costCheckObj != "OK") return costCheckObj;
            // log.debug("consuming part instance: " + userInventoryObject.Inventory[i].ItemInstanceId);
            try {
                if (userInventoryObject.Inventory[i].CustomData === undefined)//let's check if item has custom data
                {
                    return generateFailObj("Insufficient cards");
                }
                else {
                    if (userInventoryObject.Inventory[i].CustomData.Amount === undefined)//let's check if item has amount custom data
                    {
                        return generateFailObj("Insufficient cards");
                    }
                    else // let's check and see if the user has sufficent cards
                    {
                        if (userInventoryObject.Inventory[i].CustomData.Amount >= partsRequired) // he does so let's remove the appropriate amount
                        {
                            userInventoryObject.Inventory[i].CustomData.Amount -= partsRequired;
                            updateCardData = { "Amount": userInventoryObject.Inventory[i].CustomData.Amount };
                            server.UpdateUserInventoryItemCustomData(
                              {
                                  PlayFabId: currentPlayerId,
                                  ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
                                  Data: updateCardData
                              }
                            );
                        }
                        else {
                            return generateFailObj("Insufficient cards");
                        }
                    }
                }
            }
            catch (err) {
                // log.debug("itemConsumptionResult.errorCode " + err);
                return generateFailObj("Insufficient cards");
            }
            break; //for search
        }//if in inventory

    }//for
    if (partFound == false) {
        return generateFailObj("Part not found");
    }
    var subtractUserCurrencyResult;
    if (currCost > 0) {
        subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
          {
              PlayFabId: currentPlayerId,
              VirtualCurrency: cardInfo.currType,
              Amount: currCost
          }
        );
        updateCurrencySpentStatistic(cardInfo.currType, currCost);
    }
    var newPr = recalculateCarPr(car.CustomData, car.ItemId, undefined, partsCatalog);
    CarDataToBeUpdated.Pr = newPr;

    server.UpdateUserInventoryItemCustomData(
      {
          PlayFabId: currentPlayerId,
          ItemInstanceId: car.ItemInstanceId,
          Data: CarDataToBeUpdated
      }
    );
    var objectsUpdated =
    [
      {
          ItemId: args.partId,
          CatalogVersion: "PartCards",
          CustomData: updateCardData
      },
      {
          ItemId: args.carId,
          CatalogVersion: "CarsProgress",
          CustomData: CarDataToBeUpdated
      }
    ];
    // log.debug("succesfully upgraded part!");



    var currencyUpdated = {};
    i = { Inventory: objectsUpdated };
    if (subtractUserCurrencyResult !== undefined) {
        currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
        i.VirtualCurrency = currencyUpdated;
    }

    //let's udpate our profile
    updateProfileCar(args, context, currentPlayerId);

    i.Experience = UpdateExperience("Balancing", "BalancingItem", "Parts_" + cardInfo.rarity, newlvl, true);
    return generateInventoryChange("InventoryUpdatePart", i);
}
handlers.worthlessScript = function (args, context) {
    //get norbi's picture 
    var oppTexture = server.GetUserData(
    {
        PlayFabId: "B730B2C5BD143660",
        Keys: ["PicTexture"]
    }).Data.PicTexture.Value;


    //get all players in RecSubdivision1
    var td = server.GetTitleInternalData(
    {
        Keys: ["RecSubDivision1"]
    });
    var recPool = td.Data["RecSubDivision1"];
    log.debug("recPool: " + recPool);
    var recArray = JSON.parse(recPool);
    for (var i = 0; i < recArray.length; i++) {
        //set face to norbi
        var setFace = server.UpdateUserData(
        {
            PlayFabId: recArray[i].uId,
            Data: { "PicTexture": oppTexture },
            Permission: "Public"
        });
    }
}