handlers.slotChestOperation = function(args,context)
{
	//CHEST SLOTS INFO
	//SLOTS HAVE 4 STATES: 
	//"Empty" <- no chest, chestID will be null
	//"Occupied" <- chest in standard state
	//"Incoming" <- chest that has been "ordered" and will arrive in set amount of time set in each chests custom data in "Chests" catalog data. Only 1 chest may be "Incoming" at any one time
	//"Arrived" <- chest that is openable as a result of waiting the "Incoming" period or performing the "rush".

	//let's get the user's slots chest info
	var chestData = server.GetUserInternalData(
	{
		PlayFabId : currentPlayerId,
		Keys : ["ChestSlotsStatus"]
	});

	//check user slots data validity.
	if(chestData.Data.ChestSlotsStatus == undefined) return generateErrObj("No Chest Data found!");

	var slotArray = JSON.parse(chestData.Data.ChestSlotsStatus.Value);

	//check slot idx is within range
	if((Number(args.slotIndex) >= slotArray.length) || (Number(args.slotIndex) < 0)) return generateErrObj("Invalid slot index");

	var operation = args.operation;
	//check if slot is
	if(slotArray[(Number(args.slotIndex))].status == "Empty") return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // there is no chest in this slot. Refresh the client's chest slot info status

	//let's now get the chests catalogData
	var catalogData = server.GetCatalogItems({CatalogVersion : "Chests"});

	switch (operation)
	{
		//"order" works only on "Occupied" slot state
		//after succesfull operation slot state changes to "Incoming"
		case "order" :
		{
			//let's check if there are any other chests in "Incoming State"
			for(var i = 0; i < slotArray.length; i++)
			{
				if((slotArray[i].status == "Incoming") && (slotArray[i].arrivalTimeStamp > Math.floor((new Date().getTime() /1000)))) return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // there is already a chest in "Incoming state". Refresh the client's chest slot info status
			}

			//only slots that are in state "Occupied" may be set ordered and set to "Incoming" state
			if(slotArray[(Number(args.slotIndex))].status != "Occupied") return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // there is no chest in this slot. Refresh the client's chest slot info status

			slotArray[(Number(args.slotIndex))].status = "Incoming";	
			var d = new Date();	
			slotArray[(Number(args.slotIndex))].orderTimeStamp = Math.floor(Number(d.getTime()) / 1000);
			//let's get the catalog data for our slot's chest
			// we require: hoursToOpen (splitable array)
			var hoursToOpen;
			var chestInfo;
			for(var i = 0; i < catalogData.Catalog.length; i++)
			{
				if(catalogData.Catalog[i].ItemId == slotArray[(Number(args.slotIndex))].chestId)
				{
					chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
					var hoursToOpenArr = chestInfo.hoursToOpen.split(",");
					if(slotArray[(Number(args.slotIndex))].chestLeague == "0") // arena 0 has same opening time as arena 1 exception
						hoursToOpen = Number(hoursToOpenArr[0]);
					else
						hoursToOpen = Number(hoursToOpenArr[Math.min(Number(slotArray[(Number(args.slotIndex))].chestLeague) - 1, hoursToOpenArr.length - 1)]);
				}
			}
			log.debug("hoursToOpen: " + hoursToOpen);
			slotArray[(Number(args.slotIndex))].arrivalTimeStamp = Number(slotArray[(Number(args.slotIndex))].orderTimeStamp) + Math.floor(hoursToOpen * 3600);
			if(chestInfo == undefined) return generateErrObj("Could not find chest with id: " + slotArray[(Number(args.slotIndex))].chestId + " in the Chests catalog, or this chest's custom data is undefined");

			//let's update the user's chest slot data
			var chestSlotInfoString = JSON.stringify(slotArray);
			server.UpdateUserInternalData(
			{
				PlayFabId: currentPlayerId,
				Data: 
				{
					"ChestSlotsStatus" : chestSlotInfoString
				}
			});

			var r = {
				"Result" : "OK",
				"ChestSlotInfo" : slotArray
			}

			return r;

		}
		break;

		//"rush" works on "Occupied" slot state or on "Incoming" slot state with reduced cost proportional with time passed of the total time needed for chest to change from "Incoming" to "Arrived"
		//after succesfull operation slot state changes to "Arrived"
		case "rush" :
		{
			//only slots that are in state that are not "Arrived" or "Empty" may be set ordered and set to "Incoming" state. We already checked for "Empty" prior
			if(slotArray[(Number(args.slotIndex))].status == "Arrived") return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // invalid operation on this slot

			// let's get the catalog data for our slot's chest
			// we require: hoursToOpen (splitable array) and priceToUnlock (Number)
			var priceToUnlock;
			var hoursToOpen; //total
			var chestInfo;
			for(var i = 0; i < catalogData.Catalog.length; i++)
			{
				if(catalogData.Catalog[i].ItemId == slotArray[(Number(args.slotIndex))].chestId)
				{
					chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
					priceToUnlock = Number(chestInfo.priceToUnlock);
					var hoursToOpenArr = chestInfo.hoursToOpen.split(",");
					if(slotArray[(Number(args.slotIndex))].chestLeague == 0) // arena 0 has same opening time as arena 1 exception
						hoursToOpen = Number(hoursToOpenArr[0]);
					else
						hoursToOpen = Number(hoursToOpenArr[Math.min(Number(slotArray[(Number(args.slotIndex))].chestLeague), hoursToOpenArr.length - 1)]);
				}
			}

			var r; // return result

			//let's calculate the amount of gold user needs to spend to rush this chest in case it's in the "Incoming state"
			var d = new Date();
			var t = 0; // interpolator
			if(slotArray[(Number(args.slotIndex))].status == "Occupied") // if we rush an "Occupied" state slot rushPrice = priceToUnlock and therefore the interpolator will be 1.
				t = 1;
			else //"Incoming" state
				t = (Number(slotArray[(Number(args.slotIndex))].arrivalTimeStamp) - Math.floor(Number(d.getTime()) / 1000)) / (hoursToOpen * 3600);

			log.debug("interpolator: " + t);
			if(t <= 0) //this means that the chest had arrived already. This may happen on rare occasions when client and server are a few seconds out of sync
			{
				slotArray[(Number(args.slotIndex))].status = "Arrived";
				slotArray[(Number(args.slotIndex))].arrivalTimeStamp = 0; // set this for the client

				r = {
				    Result: "OK",
				    ChestSlotInfo : slotArray
				  };
			}
			else
			{
				var rushPrice = Math.floor(1 + t * (priceToUnlock - 1));

				log.debug("rushPrice: " + rushPrice);

				//we now have to querry the user's inventory to see if he has enough currency to rush the chest
				var userInventoryObject = server.GetUserInventory(
			    {
			      PlayFabId: currentPlayerId
			    });

			    if(rushPrice > userInventoryObject.VirtualCurrency.HC) return generateErrObj("Not enough HC.");

			    //let's set the user's chest slot info to "Arrived"
			    slotArray[(Number(args.slotIndex))].status = "Arrived";
				slotArray[(Number(args.slotIndex))].arrivalTimeStamp = 0; // set this for the client
				slotArray[(Number(args.slotIndex))].orderTimeStamp = 1; // set this for the client

			    //let's subtract rushPrice amount of gold from the user
			    var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
		        {
		          PlayFabId: currentPlayerId,
		          VirtualCurrency : "HC",
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
				    InventoryChange:i,
				    ChestSlotInfo : slotArray
				  };
			}

			//let's update the user's chest slot data
			var chestSlotInfoString = JSON.stringify(slotArray);
			server.UpdateUserInternalData(
			{
				PlayFabId: currentPlayerId,
				Data: 
				{
					"ChestSlotsStatus" : chestSlotInfoString
				}
			});

			return r;
		}
		break;

		case "open" :
		{
			var slotIndex = Number(args.slotIndex);
			var chestInfo;
			for(var i = 0; i < catalogData.Catalog.length; i++)
			{
				if(catalogData.Catalog[i].ItemId == slotArray[(Number(args.slotIndex))].chestId)
				{
					chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
					break;
				}
			}
			if(chestInfo == undefined) return generateErrObj("Could not find chest with id: " + slotArray[(Number(args.slotIndex))].chestId + " in the Chests catalog, or this chest's custom data is undefined");
			if(slotArray[slotIndex].status == "Empty") return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // invalid operation on this slot
			if(slotArray[slotIndex].status == "Occupied") return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // invalid operation on this slot
			if((slotArray[slotIndex].status == "Incoming") && (slotArray[slotIndex].arrivalTimeStamp > Math.floor((new Date().getTime() /1000)))) return generateFailObjCustom("ChestSlotInfo", JSON.parse(chestData.Data.ChestSlotsStatus.Value)); // invalid operation on this slot

			var chestBounty = GenerateChestBounty(currentPlayerId, slotArray[slotIndex].chestId, slotArray[slotIndex].chestLeague, chestInfo);

			var outInventory = server.GetUserInventory({PlayFabId: currentPlayerId});
			var totalXp = UpdateExperience("Chests", slotArray[slotIndex].chestId, "xpGain", 0, true);
			outInventory.Experience = totalXp;

			var returnObject = {
				Result : "OK",
				InventoryChange: outInventory,
				ChestBounty : chestBounty 
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
					"ChestSlotsStatus" : chestSlotInfoString
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
function GenerateChestBounty(currentPlayerId, chestId, league, chestInfo)
{
	var actualChestLeague = Number(league) + Number(chestInfo.arenasAdvance);
	var minimumCarLeague = actualChestLeague;
	if(chestInfo.leaguesBehind != undefined) minimumCarLeague = Number(league) - Number(chestInfo.leaguesBehind);
	minimumCarLeague = Math.min(Math.max(minimumCarLeague, 1), actualChestLeague);
	var currentStacks = 0;
	var currencyStacks = 0;
	var maxStacks = Number(chestInfo.maxCardStacks);


	var currencyUpdated = {};
	//let's calculate SC
	var scToGive = 0;
	var scArrSplit = chestInfo.guaranteedSC.split(",");
	switch(scArrSplit.length)
	{
		case 1:
		{
			scToGive = Number(scArrSplit[0]);
		}break;
		case 2:
		{
			scToGive = Number(scArrSplit[0]) + Math.floor(Math.random() * Math.abs(Number(scArrSplit[1]) - Number(scArrSplit[0])));
		}break;
		default:
		{
			scToGive = 0;
		}
	}
	if(scToGive > 0)
	{
		currencyUpdated["SC"] = scToGive;
		currentStacks++;
	} 

	//let's calculate HC
	var hcToGive = 0;
	var hcArrSplit = chestInfo.guaranteedHC.split(",");
	switch(hcArrSplit.length)
	{
		case 1:
		{
			hcToGive = Number(hcArrSplit[0]);
		}break;
		case 2:
		{
			hcToGive = Number(hcArrSplit[0]) + Math.floor(Math.random() * Math.abs(Number(hcArrSplit[1]) - Number(hcArrSplit[0])));
		}break;
		default:
		{
			hcToGive = 0;
		}
	}
	if(hcToGive > 0) 
	{
		currencyUpdated["HC"] = hcToGive;
		currentStacks++;
	}
	
	currencyStacks = currentStacks;

	//let's give guaranteed stacks
	//let's get the car catalog
	var carsCatalog = server.GetCatalogItems({CatalogVersion : "CarCards"});
	var partsCatalog = server.GetCatalogItems({CatalogVersion : "PartCards"});
//CARS LISTS
	var carInfo;
	var commonCarsList = [];
	var rareCarsList = [];
	var epicCarsList = [];

	for(var i = 0; i < carsCatalog.Catalog.length; i++)
	{
		carInfo = JSON.parse(carsCatalog.Catalog[i].CustomData);
		if(carInfo == undefined) continue;
		if(carInfo.unlockedAtRank == undefined) continue;
		if(Number(carInfo.unlockedAtRank) > Number(actualChestLeague)) continue;
		if(Number(carInfo.unlockedAtRank) < Number(minimumCarLeague)) continue;
		if(carInfo.rarity == undefined) continue;
		switch(Number(carInfo.rarity))
		{
			case 0: // common
			{
				commonCarsList.push(carsCatalog.Catalog[i].ItemId);
			}break;
			case 1: // rare
			{
				rareCarsList.push(carsCatalog.Catalog[i].ItemId);
			}break;
			case 2: // epic
			{
				epicCarsList.push(carsCatalog.Catalog[i].ItemId);
			}break;
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

	for(var i = 0; i < partsCatalog.Catalog.length; i++)
	{
		partInfo = JSON.parse(partsCatalog.Catalog[i].CustomData);
		if(partInfo.rarity == undefined) continue;
		switch(Number(partInfo.rarity))
		{
			case 0: // common
			{
				commonPartsList.push(partsCatalog.Catalog[i].ItemId);
			}break;
			case 1: // rare
			{
				rarePartsList.push(partsCatalog.Catalog[i].ItemId);
			}break;
			case 2: // epic
			{
				epicPartsList.push(partsCatalog.Catalog[i].ItemId);
			}break;
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
for(var i = 0 ; i < guaranteedCarsPerRarityArr.length; i++)
{
	totalGuaranteedCarCards += Number(guaranteedCarsPerRarityArr[i]);
}
if(Number(totalGuaranteedCarCards) > 0) chestContainsGuaranteedCarCards = true;

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
if(chestContainsGuaranteedCarCards == true)
{
	var maxStacksReservedForGuaranteedCars = Number(Math.floor((maxStacks - currentStacks) * 0.55));
	if(maxStacksReservedForGuaranteedCars <= 0) maxStacksReservedForGuaranteedCars = 1;

	//now we iterate through the rarities and generate the guaranteed car cards for each rarity
	for(var rarity = 0; rarity < 3; rarity++)
	{
		//skip this rarity if no cards are guaranteed
		if(Number(guaranteedCarsPerRarityArr[rarity]) <= 0) continue;
		//allocate stacks based on the number of guaranteed cards for this rarity and totalGuaranteedCarCards ratio
		var stacksAllocatedForThisRarity = Math.floor((
												Number(guaranteedCarsPerRarityArr[rarity]) 
												/ totalGuaranteedCarCards)
												* maxStacksReservedForGuaranteedCars
												);
		if (stacksAllocatedForThisRarity <= 0)
            stacksAllocatedForThisRarity = 1;
        //start randomly distributing the guaranteed cars. If we havent reached the stacksAllocatedForThisRarity, we can create new stacks, increment existing ones otherwise
        for(var i = 0; i < Number(guaranteedCarsPerRarityArr[rarity]); i++)
        {
        	//pick a car from the eligible list
        	var car;
           	switch(rarity)
        	{
        		case 0:
        		{
        			if(commonCarsListFinal == undefined) ln = 0;
        			else ln = Number(commonCarsListFinal.length);
        			if(ln == undefined) ln = 0;
        			var canCreateNewStack = ln < stacksAllocatedForThisRarity;
        			car = GetRandomCard(commonCarsList, actualChestLeague);
        			if(car == "ERROR") break;
        			commonCarsListFinal = AddCardToListOfStacks("CarCards",commonCarsListFinal, car, canCreateNewStack);
        		}break;
        		case 1:
        		{
        			if(rareCarsListFinal == undefined) ln = 0;
        			else ln = Number(rareCarsListFinal.length);
        			if(ln == undefined) ln = 0;
        			var canCreateNewStack = ln < stacksAllocatedForThisRarity;
        			car = GetRandomCard(rareCarsList, actualChestLeague);
        			if(car == "ERROR") break;
        			rareCarsListFinal = AddCardToListOfStacks("CarCards", rareCarsListFinal, car, canCreateNewStack);
        		}break;
        		case 2:
        		{
        			if(epicCarsListFinal == undefined) ln = 0;
        			else ln = Number(epicCarsListFinal.length);
        			if(ln == undefined) ln = 0;
        			var canCreateNewStack = ln < stacksAllocatedForThisRarity;
        			car = GetRandomCard(epicCarsList, actualChestLeague);
        			if(car == "ERROR") break;
        			epicCarsListFinal = AddCardToListOfStacks("CarCards", epicCarsListFinal, car, canCreateNewStack);
        		}break;
        		default:
        		{
        			car = "ERROR";
        		}
        	}
        	//if(car == "ERROR") return "Error";       	

        }
	}
}
if(commonCarsListFinal != undefined) currentStacks += commonCarsListFinal.length;
if(rareCarsListFinal != undefined) currentStacks += rareCarsListFinal.length;
if(epicCarsListFinal != undefined) currentStacks += epicCarsListFinal.length;

//Generate the random card rewards
log.debug("== part rarity droprates: " + chestInfo.partRarityDroprates);
var partRarityDroprates = chestInfo.partRarityDroprates.split(",");
var sumOfPartWeights = 0;
for(var i = 0; i < partRarityDroprates.length; i++)
{
	log.debug("== part rarity droprate[" + i + "]" + partRarityDroprates[i]);
	sumOfPartWeights += partRarityDroprates[i];
}
var carRarityDroprates = chestInfo.carRarityDroprates.split(",");
var sumOfCarWeights = 0;
for(var i = 0; i < carRarityDroprates.length; i++)
{
	sumOfCarWeights += carRarityDroprates[i];
}

var partBias = 70; // chance that a rnadom card will be a part
var canCreateNewStack;
var currentRarity = 0;
var tempString;
var beforeLn;
for(var i = 0; i < Number(chestInfo.randomCardsReward); i++)
{
	canCreateNewStack = currentStacks < maxStacks;
	//is it a part or a car?
	if(Math.floor(Math.random() * 100) < partBias) // this is a part
	{
		currentRarity = WeightedRandom(partRarityDroprates);
		switch(currentRarity)
		{
			case 0:
			{
				tempString = GetRandomCard(commonPartsList, actualChestLeague);
				if (tempString == "ERROR") break;
				if(commonPartsListFinal == undefined) beforeLn = 0;
				else beforeLn = commonPartsListFinal.length;

				if(beforeLn == undefined) beforeLn = 0;
				commonPartsListFinal = AddCardToListOfStacks("PartCards", commonPartsListFinal, tempString, canCreateNewStack);
				if(commonPartsListFinal.length > beforeLn) currentStacks++;
			}break;
			case 1:
			{
				tempString = GetRandomCard(rarePartsList, actualChestLeague);
				if (tempString == "ERROR") break;
				if(rarePartsListFinal == undefined) beforeLn = 0
				else beforeLn = rarePartsListFinal.length;
				if(beforeLn == undefined) beforeLn = 0;
				rarePartsListFinal = AddCardToListOfStacks("PartCards", rarePartsListFinal, tempString, canCreateNewStack);
				if(rarePartsListFinal.length > beforeLn) currentStacks++;
			}break;
			case 2:
			{
				tempString = GetRandomCard(epicPartsList, actualChestLeague);
				if (tempString == "ERROR") break;
				if(epicPartsListFinal == undefined) beforeLn = 0
				else beforeLn = epicPartsListFinal.length;
				if(beforeLn == undefined) beforeLn = 0;
				epicPartsListFinal = AddCardToListOfStacks("PartCards", epicPartsListFinal, tempString, canCreateNewStack);
				if(epicPartsListFinal.length > beforeLn) currentStacks++;
			}break;
		}
	}
	else
	{
		currentRarity = WeightedRandom(carRarityDroprates);
		switch(currentRarity)
		{
			case 0:
			{
				tempString = GetRandomCard(commonCarsList, actualChestLeague);
				if (tempString == "ERROR") break;
				if(commonCarsListFinal == undefined) beforeLn = 0
				else beforeLn = commonCarsListFinal.length;
				if(beforeLn == undefined) beforeLn = 0;
				commonCarsListFinal = AddCardToListOfStacks("CarCards", commonCarsListFinal, tempString, canCreateNewStack);
				if(commonCarsListFinal.length > beforeLn) currentStacks++;
			}break;
			case 1:
			{
				tempString = GetRandomCard(rareCarsList, actualChestLeague);
				if (tempString == "ERROR") break;
				if(rareCarsListFinal == undefined) beforeLn = 0
				else beforeLn = rareCarsListFinal.length;
				if(beforeLn == undefined) beforeLn = 0;
				rareCarsListFinal = AddCardToListOfStacks("CarCards", rareCarsListFinal, tempString, canCreateNewStack);
				if(rareCarsListFinal.length > beforeLn) currentStacks++;
			}break;
			case 2:
			{
				tempString = GetRandomCard(epicCarsList, actualChestLeague);
				if (tempString == "ERROR") break;
				if(epicCarsListFinal == undefined) beforeLn = 0
				else beforeLn = epicCarsListFinal.length;
				if(beforeLn == undefined) beforeLn = 0;
				epicCarsListFinal = AddCardToListOfStacks("CarCards", epicCarsListFinal, tempString, canCreateNewStack);
				if(epicCarsListFinal.length > beforeLn) currentStacks++;
			}break;
		}
	}

}
//var dataChangedLn = currentStacks + currentStacks;
var dataChanged = [];
if(commonCarsListFinal != undefined) dataChanged = dataChanged.concat(commonCarsListFinal);
if(rareCarsListFinal != undefined) dataChanged = dataChanged.concat(rareCarsListFinal);
if(epicCarsListFinal != undefined) dataChanged = dataChanged.concat(epicCarsListFinal);
if(commonPartsListFinal != undefined) dataChanged = dataChanged.concat(commonPartsListFinal);
if(rarePartsListFinal != undefined) dataChanged = dataChanged.concat(rarePartsListFinal);
if(epicPartsListFinal != undefined) dataChanged = dataChanged.concat(epicPartsListFinal);

//apply arena bias
var balanceCatalog = server.GetCatalogItems({CatalogVersion : "Balancing"});
var balanceInfo = JSON.parse(balanceCatalog.Catalog[0].CustomData);
var tArena = Math.min(Number(league), 10);
var arenaBonus = Number(balanceInfo.ArenaBonuses[tArena]);
if(arenaBonus > 0)
	for(var i = 0; i < dataChanged.length; i++)
	{
		dataChanged[i].CustomData.Amount = Math.floor(Number(dataChanged[i].CustomData.Amount) + Number(dataChanged[i].CustomData.Amount) * (arenaBonus/100));
	}

   //let's give the user the money
   var addUserCurrencyResult;
   //HC
   if(currencyUpdated.HC != undefined)
   {
   	currencyUpdated.HC = Math.floor(Number(currencyUpdated.HC) + Number(currencyUpdated.HC) * (arenaBonus/100));
   	if(Number(currencyUpdated.HC) > 0)
	   	addUserCurrencyResult = server.AddUserVirtualCurrency(
	      {
	        PlayFabId: currentPlayerId,
	        VirtualCurrency : "HC",
	        Amount: Number(currencyUpdated.HC)
	      });
   }
   //HC
   if(currencyUpdated.SC != undefined)
   {
   	currencyUpdated.SC = Math.floor(Number(currencyUpdated.SC) + Number(currencyUpdated.SC) * (arenaBonus/100));
   	if(Number(currencyUpdated.SC) > 0)
   	addUserCurrencyResult = server.AddUserVirtualCurrency(
      {
        PlayFabId: currentPlayerId,
        VirtualCurrency : "SC",
        Amount: Number(currencyUpdated.SC)
      });
   }
   //Let's grant the user the items
   var userInventoryObject = server.GetUserInventory({PlayFabId: currentPlayerId});

   var itemFound = false;
   var newAmount = 0;
   var iData;
   for(var i = 0; i < dataChanged.length; i++)
   {
   	for(var j = 0; j < userInventoryObject.Inventory.length; j++)
   	{
   	  itemFound = false;
      newAmount = 0;
      if((userInventoryObject.Inventory[j].ItemId == dataChanged[i].ItemId) && (userInventoryObject.Inventory[j].CatalogVersion == dataChanged[i].CatalogVersion)) // we found the item
      {
          if(userInventoryObject.Inventory[j].CustomData == undefined)
          {
            newAmount = Number(dataChanged[i].CustomData.Amount);
          }
          else
          {
            if(userInventoryObject.Inventory[j].CustomData.Amount == undefined)
            	newAmount = Number(dataChanged[i].CustomData.Amount);
            else
            {
              if(isNaN(Number(userInventoryObject.Inventory[j].CustomData.Amount)))
              	newAmount = Number(dataChanged[i].CustomData.Amount);
              else
              	newAmount = Number(userInventoryObject.Inventory[j].CustomData.Amount) + Number(dataChanged[i].CustomData.Amount);
            }
          }
          iData = {"Amount" : newAmount};
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
    if(itemFound == false)
      {
        var itemsToGrant = [dataChanged[i].ItemId];
        var grantVar = server.GrantItemsToUser(
          {
            CatalogVersion : dataChanged[i].CatalogVersion,
            PlayFabId: currentPlayerId,
            ItemIds : itemsToGrant
          }
        );

        iData = {"Amount" : dataChanged[i].CustomData.Amount};
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
function grantUserChest(currentPlayerId, source)
{
	//let's get the chests catalog data
	var catalogData = server.GetCatalogItems({CatalogVersion : "Chests"});

	//let's also get the user's chest slot info data
	var chestData = server.GetUserInternalData(
	{
		PlayFabId : currentPlayerId,
		Keys : ["ChestSlotsStatus"]
	});

	//check user slots data validity.
	if(chestData.Data.ChestSlotsStatus == undefined) return generateErrObj("No Chest Data found!");

	var slotArray = JSON.parse(chestData.Data.ChestSlotsStatus.Value);

	var slotIndex = -1; //what's the slot index that this operation will fill with a chest? if -1 then all slots are full
	//let's check if there are any Empty slots. If not then we give the user nothing
	for(var i = 0; i < slotArray.length; i++)
	{
		if(slotArray[i].status == "Empty") 
			{
				slotIndex = i;
				break;
			}
	}	

	if(slotIndex < 0) return; // we found no empty slot. No further operations necessary
	log.debug("emptySlotFound: " + slotIndex);
	//we need the trophy count to calculate the league the user is in
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
	//the source can be "endGameNormal", "endGameFreeWin" and "tutorial"
	switch(source)
	{
		case "endGameNormal" : // we examine all the chests' "dropChance" variable and decide which will drop and fill the user's slot 
		{
			var chestInfo;
			var sumOfWeights = 0;
			var leftRange =0;
			var rightRange = 0;
			var chestWeightsArray = [];
			for(var i = 0; i < catalogData.Catalog.length; i++)
			{
				chestInfo = JSON.parse(catalogData.Catalog[i].CustomData);
				if(Number(chestInfo.dropChance) <= 0) continue; // this chest will never be added to a slot in this manner
				sumOfWeights += Number(chestInfo.dropChance) * 10; //we multiply by 10 for drop chances that have a decimal point
				leftRange = rightRange;
				rightRange = sumOfWeights; 
				var chestItem = 
				{
					"chestId" : catalogData.Catalog[i].ItemId,
					"leftRange" : leftRange,
					"rightRange" : rightRange
				}
				chestWeightsArray.push(chestItem);
			}
			if(chestWeightsArray.length <= 0) // if for whatever reason the chestWeightArray is 0 we will grant the user the "SilverChest"
			{
				slotArray[slotIndex].chestId = "SilverChest";
			}
			else
			{
				//calculate what chest will occupy slot based on ChestWeightArray
				var randVal = Math.floor(Math.random() * sumOfWeights);
				var chestFound = "SilverChest";
				for(var i = 0; i < chestWeightsArray.length; i++)
				{
					if(Number(chestWeightsArray[i].rightRange) <= Number(randVal)) continue;
					if(Number(chestWeightsArray[i].leftRange) > Number(randVal)) continue;
					chestFound = chestWeightsArray[i].chestId;
					break;
				}
				slotArray[slotIndex].chestId = chestFound;
			}

			slotArray[slotIndex].chestLeague = cLeague;
			slotArray[slotIndex].status = "Occupied";
			slotArray[slotIndex].orderTimeStamp = 0;
			slotArray[slotIndex].arrivalTimeStamp = 0;


		}break;
		case "endGameFreeWin" :
		{
			slotArray[slotIndex].chestId = "QuickChest";
			slotArray[slotIndex].chestLeague = cLeague;
			slotArray[slotIndex].status = "Occupied";
			slotArray[slotIndex].orderTimeStamp = 0;
			slotArray[slotIndex].arrivalTimeStamp = 0;
		}break;
		case "tutorial" :
		{
			slotArray[slotIndex].chestId = "QuickChest";
			slotArray[slotIndex].chestLeague = 1;
			slotArray[slotIndex].status = "Occupied";
			slotArray[slotIndex].orderTimeStamp = 0;
			slotArray[slotIndex].arrivalTimeStamp = 0;
		}break;
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
				"ChestSlotsStatus" : chestSlotInfoString
			}
		});

}
