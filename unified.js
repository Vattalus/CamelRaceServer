function generateFailObj(mess, data) {
    var retObj = {
        Result: "Failed",
        Message: mess,
        Data: data
    };
    return retObj;
}

function generateErrObj(mess, data) {
    var retObj = {
        Result: "Error",
        Message: mess,
        Data: data
    };
    return retObj;
}

function loadTitleDataJson(key) {
    var tData = server.GetTitleData(
    {
        PlayFabId: currentPlayerId,
        Keys: [key]
    }
    );

    if (tData == undefined || tData.Data == undefined || tData.Data[key] == undefined)
        return null;

    var tDataJSON = JSON.parse(tData.Data[key]);

    if (tDataJSON == undefined)
        return null;

    return tDataJSON;
}

//get the current server time timestamp (seconds)
function getServerTime() {
    return Math.floor((new Date().getTime() / 1000));
}

//random int between min and max (both inclusive)
function randomRange(min, max) {
    return Math.round(Math.random() * (Number(max) - Number(min))) + Number(min);
}

//Add Virtual Currency
function addCurrency(currCode, amount) {
    server.AddUserVirtualCurrency(
{
    PlayFabId: currentPlayerId,
    "VirtualCurrency": currCode,
    "Amount": amount
});
}

//Pay Virtual Currency (returns null if cannot afford)
function payCurrency(scAmount, hcAmount, tkAmount) {
    var VirtualCurrencyObject = server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency;

    if ((scAmount != undefined && scAmount != null && scAmount > VirtualCurrencyObject.SC) ||
    (hcAmount != undefined && hcAmount != null && hcAmount > VirtualCurrencyObject.HC) ||
    (tkAmount != undefined && tkAmount != null && tkAmount > VirtualCurrencyObject.TK))
        return null;

    //subtract currency
    if (scAmount != undefined && scAmount != null && Number(scAmount) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "SC", "Amount": scAmount });
        VirtualCurrencyObject.SC -= scAmount;
    }

    if (hcAmount != undefined && hcAmount != null && Number(hcAmount) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "HC", "Amount": hcAmount });
        VirtualCurrencyObject.HC -= hcAmount;
    }

    if (tkAmount != undefined && tkAmount != null && Number(tkAmount) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "TK", "Amount": tkAmount });
        VirtualCurrencyObject.HC -= tkAmount;
    }

    return VirtualCurrencyObject;
}

//Add Experience
function addExperience(expGain) {

    //read the 'LevelProgress' variable from player's read-only data
    var playerData = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["LevelProgress"]
    });

    var playerLevelProgressJSON = {};

    if (playerData.Data.LevelProgress != undefined && playerData.Data.LevelProgress != null) {
        //successfully loaded player's level data
        playerLevelProgressJSON = JSON.parse(playerData.Data.LevelProgress.Value);

        if (playerLevelProgressJSON == undefined || playerLevelProgressJSON == null) {
            return null; //Failed to convert to JSON
        }
    } else {
        //player's level data does not exist yet, initialize
        playerLevelProgressJSON.Experience = 0;
        playerLevelProgressJSON.Level = 0;
        playerLevelProgressJSON.LastLevelReward = 0;
    }

    //Increment Experience value
    playerLevelProgressJSON.Experience = Number(playerLevelProgressJSON.Experience) + Number(expGain);

    //Recalculate level (Load the level thresholds from title data)
    var levelsBalancingJSON = loadTitleDataJson("Balancing_PlayerLevels");

    if (levelsBalancingJSON == undefined || levelsBalancingJSON == null || levelsBalancingJSON.length == 0)
        return null; //Failed to load balancing data

    //Recalculate level
    var currLvl = 0;
    for (var i = 0; i < levelsBalancingJSON.length; i++) {
        currLvl = i;
        if (playerLevelProgressJSON.Experience < Number(levelsBalancingJSON[i].Threshold)) {
            break;
        }
    }

    //Update level value
    playerLevelProgressJSON.Level = currLvl;

    //update the player's level data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "LevelProgress": JSON.stringify(playerLevelProgressJSON) }
    });

    //return the updated level data value
    return playerLevelProgressJSON;
}

function contains(arr, value) {
    var i = arr.length;
    while (i--) {
        if (arr[i] === value) return true;
    }
    return false;
}
//Load camel data
function loadCamelsData() {

    var camels = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["Camels"]
    });

    //check existance of Camels object
    if ((camels.Data.Camels == undefined || camels.Data.Camels == null))
        return null;

    var camelsDataJSON = JSON.parse(camels.Data.Camels.Value);

    if (camelsDataJSON == undefined || camelsDataJSON == null)
        return null;

    return camelsDataJSON;
}

//Generate new camel

//args.baseAcc
//args.baseSpeed
//args.baseGallop
//args.baseStamina
function createEmptyCamelProfile(args) {
    var newCamelJson = {
        "Name": "CamelName",
        "Quality": 0,
        //base stats
        "BaseAcc": 0,
        "BaseSpeed": 0,
        "BaseGallop": 0,
        "BaseStamina": 0,
        //current stats (with training and upgrade bonuses)
        "Acceleration": 0,
        "Speed": 0,
        "Gallop": 0,
        "Stamina": 0,
        //item levels
        "HeadGear": 0,
        "Robot": 0,
        "Whip": 0,
        "Robe": 0,
        "Bridle": 0,
        //steroids
        "SteroidsLeft": 0,
        //training
        "TrainingLevels":
        {
            "Acceleration": 0,
            "Speed": 0,
            "Gallop": 0,
            "Stamina": 0
        },
        //current training
        "CurrentlyTrainingStat": "none",
        "TrainingEnds": 0,
        //Value
        "CamelValue": 0,
        "BreedingCompletionTimestamp": 0, //wait timer used for newly bred camels

        "Customization": {
            "CamelModel": 0,
            "CamelSeed": 0,
            "Saddle": "Basic",
            "Robot": "Basic",
            "Hat": "Basic",
            "Shoes": "Basic"
        }
    }

    //apply provided base stats
    if (args.BaseAcc != undefined && args.BaseAcc != null) {
        newCamelJson.BaseAcc = args.BaseAcc;
        newCamelJson.Acceleration = args.BaseAcc;
    }

    if (args.BaseSpeed != undefined && args.BaseSpeed != null) {
        newCamelJson.BaseSpeed = args.BaseSpeed;
        newCamelJson.Speed = args.BaseSpeed;
    }

    if (args.BaseGallop != undefined && args.BaseGallop != null) {
        newCamelJson.BaseGallop = args.BaseGallop;
        newCamelJson.Gallop = args.BaseGallop;
    }

    if (args.BaseStamina != undefined && args.BaseStamina != null) {
        newCamelJson.BaseStamina = args.BaseStamina;
        newCamelJson.Stamina = args.BaseStamina;
    }

    return newCamelJson;
}

//returns the number of camels that the player can actually use at the moment
function getNumberOfAvailableCamels(ownedCamelsListJSON) {

    if (ownedCamelsListJSON == undefined || ownedCamelsListJSON == null || Number(ownedCamelsListJSON.length) <= 0) //provided list is corrupted or empty
        return 0;

    var serverTime = getServerTime();

    var availableCamels = 0;

    for (var i = 0; i < ownedCamelsListJSON.length; i++) {

        //check if 'fully grown'
        if (Number(selectedCamel.BreedingCompletionTimestamp) > serverTime)
            continue;

        //check if camel is currently training
        if (Number(camelJSON.TrainingEnds) > 0)
            continue;

        availableCamels++;
    }

    return availableCamels;
}
//args.camelIndex
//args.customizationType
//args.itemId
handlers.customizeCamel = function (args, context) {

    //first of all, load the player's owned camels list
    var camelsData = loadCamelsData();

    if (camelsData == undefined || camelsData == null)
        return generateErrObj("Player's 'Camels' object was not found");

    var selectedCamel = camelsData.OwnedCamelsList[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    //check to see if given item is already owned
    //load title data
    var tData = server.GetTitleData(
    {
        PlayFabId: currentPlayerId,
        Keys: "OwnedCustomizationItems"
    });

    if (tData == undefined || tData.Data == null)
        return generateErrObj("Error retrieving 'OwnedCustomizationItems'.");

    var ownedCustomizationJSON = {};

    if (tData.Data.OwnedCustomizationItems != undefined && tData.Data.OwnedCustomizationItems != null && JSON.parse(tData.Data.OwnedCustomizationItems) != undefined && JSON.parse(tData.Data.OwnedCustomizationItems) != null) {
        ownedCustomizationJSON = JSON.parse(tData.Data.OwnedCustomizationItems);
    }

    if (ownedCustomizationJSON[args.customizationType] == undefined || ownedCustomizationJSON[args.customizationType] == null || ownedCustomizationJSON[args.customizationType].length == 0) {
        ownedCustomizationJSON[args.customizationType] = ["Basic"];

        //update on server
        server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "OwnedCustomizationItems": JSON.stringify(ownedCustomizationJSON) }
        });
    }


    var itemOwned = contains(ownedCustomizationJSON[args.customizationType], args.itemId);

    //if customization already owned, set it as current customization for the selected camel and return
    if (itemOwned == true) {
        selectedCamel.Customization[args.customizationType] = args.itemId;

        //update the player's Camels data
        server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "Camels": JSON.stringify(camelsData) }
        });

        return {
            Result: "OK",
            CamelData: selectedCamel
        }
    }

    //customization not owned

    //check to see it item exists in the catalog
    var catalogData = server.GetCatalogItems({ "CatalogVersion": "Customization" + args.customizationType });

    log.debug(catalogData.Catalog);

    var catalogItemsList = JSON.parse(catalogData.Catalog);

    //check if data loaded correctly
    if (catalogItemsList == undefined || catalogItemsList == null || catalogItemsList.length == 0)
        return generateErrObj("Catalog version: Customization" + args.customizationType + "not found or empty");

    var customizationItemData = {};

    for (var i = 0; i < catalogItemsList.length; i++) {
        if (catalogItemsList[i].ItemId == args.itemId) {
            customizationItemData = catalogItemsList[i];
            break;
        }
    }

    if (customizationItemData == null)
        return generateErrObj("Catalog item: " + args.itemId + " not found");

    //Now, pay the virtual currency cost
    //TODO inside the payCurrency function cast the parameters into numbers before checking if > VirtualCurrencyObject.currcode
    var VirtualCurrencyObject = payCurrency(customizationItemData.VirtualCurrencyPrices.SC, customizationItemData.VirtualCurrencyPrices.HC);

    if (VirtualCurrencyObject == null)
        return generateFailObj("Can't afford customization");

    //add the purchased customization item to list of owned items
    ownedCustomizationJSON[args.customizationType].add(args.itemId);

    //set the customization as current customization for the selected camel
    selectedCamel.Customization[args.customizationType] = args.itemId;

    //update the players owned customization list and cameldata in titledata
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: {
            "OwnedCustomizationItems": JSON.stringify(ownedCustomizationJSON),
            "Camels": JSON.stringify(camelsData)
        }
    });

    return {
        Result: "OK",
        CamelData: selectedCamel,
        OwnedCustomizationItems: ownedCustomizationJSON,
        VirtualCurrency: VirtualCurrencyObject
    }
}//Breeds the player's camel of given index, with the breeding candidate of given index
//args.camelIndex
//args.candidateIndex
handlers.breedCamel = function (args, context) {
    //first of all, load the player's owned camels list
    var readonlyData = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["Camels", "BreedingCandidates"]
    });

    //check existance of Camels object
    if ((readonlyData.Data.Camels == undefined || readonlyData.Data.Camels == null))
        return generateErrObj("Player's 'Camels' object was not found");

    var camelsJSON = JSON.parse(readonlyData.Data.Camels.Value);
    var selectedCamel = camelsJSON.OwnedCamelsList[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    //check if number of owned camels has reached limit
    if (Number(camelsJSON.OwnedCamelsList.length) >= Number(loadTitleDataJson("MaxCamelSlots")))
        return generateFailObj("Number of owned camels reached max limit");

    //Now, find the breeding candidate of index [candidateIndex]

    //check if loaded data is valid
    if (readonlyData.Data.BreedingCandidates == undefined || readonlyData.Data.BreedingCandidates == null)
        return generateErrObj("Player's breeding candidates not found");

    var breedingCandidatesData = JSON.parse(readonlyData.Data.BreedingCandidates.Value);

    //make sure candidate of index [candidateIndex] exists
    if (breedingCandidatesData == undefined || breedingCandidatesData == null ||
        breedingCandidatesData.CandidateList == undefined || breedingCandidatesData.CandidateList == null ||
        breedingCandidatesData.CandidateList.length <= Number(args.candidateIndex) ||
        breedingCandidatesData.CandidateList[Number(args.candidateIndex)] == undefined ||
        breedingCandidatesData.CandidateList[Number(args.candidateIndex)] == null)
        return generateErrObj("Breeding candidate of index" + args.candidateIndex + " not found");

    var selectedCandidate = breedingCandidatesData.CandidateList[Number(args.candidateIndex)];

    //check if selected candidate is available
    if (selectedCandidate.Available == false)
        return generateFailObj("Selected candidate is not available");

    //Now, pay the virtual currency cost
    var VirtualCurrencyObject = payCurrency(selectedCandidate.CostSC, selectedCandidate.CostHC);

    if (VirtualCurrencyObject == null)
        return generateFailObj("Can't afford breeding");

    //determine level bonus to stat
    var statBonusFromLevel = Number(0);

    if (newLevelProgress != null && newLevelProgress.Level != undefined && newLevelProgress.Level != null) {
        statBonusFromLevel = Number(newLevelProgress.Level);
    }

    //so far everything is ok, let's create a new camel json object and populate it based on selected camel and selected candidate
    var newCamelParams = {
        "BaseAcc": randomRange(selectedCamel.Acceleration, selectedCandidate.Acceleration) + statBonusFromLevel,
        "BaseSpeed": randomRange(selectedCamel.Speed, selectedCandidate.Speed) + statBonusFromLevel,
        "BaseGallop": randomRange(selectedCamel.Gallop, selectedCandidate.Gallop) + statBonusFromLevel,
        "BaseStamina": randomRange(selectedCamel.Stamina, selectedCandidate.Stamina) + statBonusFromLevel
    }
    var newCamelJson = createEmptyCamelProfile(newCamelParams);

    //determine quality
    newCamelJson.Quality = Math.floor(Number(selectedCamel.Quality) + Number(selectedCandidate.Quality));

    //add wait time
    newCamelJson.BreedingCompletionTimestamp = getServerTime() + (Number(selectedCandidate.WaitTimeHours) * 3600);

    //add the newly created camel to the player's list of owned camels
    camelsJSON.OwnedCamelsList.push(newCamelJson);

    //mark the selected candidate as non-available
    selectedCandidate.Available = false;

    //update the player's readonly data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: {
            "Camels": JSON.stringify(camelsJSON),
            "BreedingCandidates": JSON.stringify(breedingCandidatesData)
        }
    });

    //add xp
    var newLevelProgress = null;
    var breedingBalancing = loadTitleDataJson("Balancing_Breeding");
    if (breedingBalancing != undefined && breedingBalancing != null && breedingBalancing.ExpGain != undefined && breedingBalancing.ExpGain != null && breedingBalancing.ExpGain.length > newCamelJson.Quality) {
        newLevelProgress = addExperience(Number(breedingBalancing.ExpGain[newCamelJson.Quality]));
    }

    //return the profile data of the newly created camel, and the new currency balance
    return {
        Result: "OK",
        NewCamelProfile: newCamelJson,
        VirtualCurrency: VirtualCurrencyObject,
        LevelProgress: newLevelProgress //Add XP
    }
}
//Returns the list of breeding candidates. If they are expired, it generates a new list of candidates
handlers.getBreedingCandidates = function (args, context) {

    //First, load the player's list of candidates and check if they are still valid
    var breedingCandidatesObj = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["BreedingCandidates"]
    });

    //Json data of the breeding candidates object
    var breedingCandidatesJSON = {};

    if (breedingCandidatesObj.Data.BreedingCandidates != undefined && breedingCandidatesObj.Data.BreedingCandidates != null)
        breedingCandidatesJSON = JSON.parse(breedingCandidatesObj.Data.BreedingCandidates.Value);

    //if json parsing failed, OR json does not contain expiration timestamp OR expiration timestamp has passed, generate a new breedingCandidatesJSON
    if (breedingCandidatesJSON == undefined || breedingCandidatesJSON == null ||
        breedingCandidatesJSON.ExpirationTimestamp == undefined || breedingCandidatesJSON.ExpirationTimestamp == null ||
        Number(breedingCandidatesJSON.ExpirationTimestamp) <= getServerTime()) {
        //Generate new Breeding Candidates
        breedingCandidatesJSON = GenerateBreedingCandidates();
    }

    if (breedingCandidatesJSON == undefined || breedingCandidatesJSON == null)
        return generateErrObj("Something went wrong");

    return {
        Result: "OK",
        BreedingCandidatesData: breedingCandidatesJSON
    }
}

//generates a new list of breeding camel candidates, based on balancing values found in title data.
//returns null, if something went wrong
function GenerateBreedingCandidates() {

    //Load the balancing values from title data
    var breedingCandidatesBalancing = loadTitleDataJson("Balancing_Breeding");

    if (breedingCandidatesBalancing == undefined || breedingCandidatesBalancing == null)
        return null;

    //Check Validity
    if (breedingCandidatesBalancing.CandidatesResetTimeHours == undefined || breedingCandidatesBalancing.CandidatesResetTimeHours == null ||
        breedingCandidatesBalancing.BreedingCandidates == undefined || breedingCandidatesBalancing.BreedingCandidates == null ||
        breedingCandidatesBalancing.BreedingCandidates.length == 0) {
        return null;
    }

    //Create a new object to store the player's breeding candidates
    var breedingCandidatesJSON = {};

    //Add expiration timestamp
    breedingCandidatesJSON.ExpirationTimestamp = getServerTime() + (Number(breedingCandidatesBalancing.CandidatesResetTimeHours) * Number(3600));

    //Create candidate list
    breedingCandidatesJSON.CandidateList = [];
    for (var i = 0; i < breedingCandidatesBalancing.BreedingCandidates.length; i++) {
        var newBreedingCandidate = {};

        newBreedingCandidate.Available = true;
        newBreedingCandidate.Quality = breedingCandidatesBalancing.BreedingCandidates[i].Quality;
        newBreedingCandidate.CostSC = breedingCandidatesBalancing.BreedingCandidates[i].CostSC;
        newBreedingCandidate.CostHC = breedingCandidatesBalancing.BreedingCandidates[i].CostHC;

        //distribute stats
        var acceleration = Number(0);
        var speed = Number(0);
        var gallop = Number(0);
        var stamina = Number(0);

        var statsToDistribute = Number(breedingCandidatesBalancing.BreedingCandidates[i].TotalStats);

        for (var j = 0; j < statsToDistribute; j++) {
            var randomDistribution = Math.random() * Number(4);

            if (randomDistribution < Number(1)) {
                //Acceleration
                acceleration++;
            } else {
                if (randomDistribution < Number(2)) {
                    //Speed
                    speed++;
                } else {
                    if (randomDistribution < Number(3)) {
                        //Gallop
                        gallop++;
                    } else {
                        //Stamina
                        stamina++;
                    }
                }
            }
        }

        //set stats
        newBreedingCandidate.Acceleration = acceleration;
        newBreedingCandidate.Speed = speed;
        newBreedingCandidate.Gallop = gallop;
        newBreedingCandidate.Stamina = stamina;

        //set wait time
        newBreedingCandidate.WaitTimeHours = breedingCandidatesBalancing.BreedingCandidates[i].WaitTimeHours;

        //Add newly created candidate to list
        breedingCandidatesJSON.CandidateList.push(newBreedingCandidate);
    }

    //save the breeding candidate information to player's read-only data
    server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "BreedingCandidates": JSON.stringify(breedingCandidatesJSON) }
        }
    );

    //return the newly created breeding candidate data
    return breedingCandidatesJSON;
}
//Adds the first camel to the player's list of owned camels
//
//Arguments
//args.camelName - name of the camel
//args.baseAcc
//args.baseSpeed
//args.baseGallop
//args.baseStamina
handlers.pickStartingCamel = function (args, context) {
    //first of all, we need to make sure that the player does not already own a camel (starting camel can only be picked once)
    var camelsData = loadCamelsData();

    if (camelsData == null)
        camelsData = {};

    //if the player already owns at least one camel, they cannot pick a starting camel again. So, return a fail object
    if (camelsData.OwnedCamelsList != undefined
        && camelsData.OwnedCamelsList != null
        && camelsData.OwnedCamelsList.length > 0
        && (camelsData.OwnedCamelsList[0].name != undefined || camelsData[0].OwnedCamelsList.name != null))
        return generateFailObj("Player already owns a camel");

    //so far, everything seems to be ok

    //set selected camel to 0
    camelsData.SelectedCamel = 0;

    var baseAcc = Number(0);
    if (args.baseAcc != undefined && args.baseAcc != null && !isNaN(Number(args.baseAcc)))
        baseAcc = args.baseAcc;

    var baseSpeed = Number(0);
    if (args.baseSpeed != undefined && args.baseSpeed != null && !isNaN(Number(args.baseSpeed)))
        baseSpeed = args.baseSpeed;

    var baseGallop = Number(0);
    if (args.baseGallop != undefined && args.baseGallop != null && !isNaN(Number(args.baseGallop)))
        baseGallop = args.baseGallop;

    var baseStamina = Number(0);
    if (args.baseStamina != undefined && args.baseStamina != null && !isNaN(Number(args.baseStamina)))
        baseStamina = args.baseStamina;

    //create the new camel object, and add it to the list of owned camels
    var newCamelParams = {
        "baseAcc": baseAcc,
        "baseSpeed": baseSpeed,
        "baseGallop": baseGallop,
        "baseStamina": baseStamina
    }
    var newCamelJson = createEmptyCamelProfile(newCamelParams);

    camelsData.OwnedCamelsList = new Array();
    camelsData.OwnedCamelsList.push(newCamelJson);

    //update the player's readonly data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsData) }
    });

    return {
        Result: "OK",
        CamelProfile: newCamelJson
    }
}
//Sets the selected camel index to the param value
//args.camelIndex
handlers.selectCamel = function (args, context) {
    //first of all, load the player's owned camels list
    var camels = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["Camels"]
    });

    //check existance of Camels object
    if ((camels.Data.Camels == undefined || camels.Data.Camels == null))
        return generateErrObj("Player's 'Camels' object was not found");

    var camelsJSON = JSON.parse(camels.Data.Camels.Value);
    var camelObject = camelsJSON.OwnedCamelsList[args.camelIndex];

    if (camelObject == undefined || camelObject == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    var serverTime = getServerTime();

    //now check if we can select this camel
    if (camelObject.BreedingCompletionTimestamp == undefined || camelObject.BreedingCompletionTimestamp == null || Number(camelObject.BreedingCompletionTimestamp) >= serverTime)
        return generateFailObj("Camel cannot be selected: currently breeding");

    if (camelObject.TrainingEnds == undefined || camelObject.TrainingEnds == null || Number(camelObject.TrainingEnds) >= serverTime)
        return generateFailObj("Camel cannot be selected: currently training");

    //change the slected camel index
    camelsJSON.SelectedCamel = args.camelIndex;

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsJSON) }
    });

    return {
        Result: "OK"
    }
}
//Sells the camel with the given index, and returns the new currency balance
handlers.sellCamel = function (args, context) {

    //check if there is another available camel left after sell
}
//Upgrades the given item on a camel
//
//Arguments
//args.camelIndex
handlers.takeSteroids = function (args, context) {

    //first of all, load the player's owned camels list
    var camelsData = loadCamelsData();

    if (camelsData == undefined || camelsData == null)
        return generateErrObj("Player's 'Camels' object was not found");

    var selectedCamel = camelsData.OwnedCamelsList[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    if (Number(selectedCamel.SteroidsLeft) > Number(0))
        return generateFailObj("Camel already on steroids");

    //load the steroids balancing values from title data
    var steroidsBalancing = loadTitleDataJson("Balancing_Steroids");

    if (steroidsBalancing == undefined || steroidsBalancing == null)
        return generateErrObj("Steroids Balancing JSON undefined or null");

    //Now, pay the virtual currency cost
    var VirtualCurrencyObject = payCurrency(steroidsBalancing.CostSC, steroidsBalancing.CostHC);

    if (VirtualCurrencyObject == null)
        return generateFailObj("Can't afford steroids");

    //set steroids charges left
    selectedCamel.SteroidsLeft = steroidsBalancing.EffectDuration;

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsData) }
    });

    return {
        Result: "OK",
        CamelData: selectedCamel,
        VirtualCurrency: VirtualCurrencyObject
    }
}
//Trains the given stat
//
//Arguments
//args.camelIndex
//args.statType
handlers.startTraining = function (args, context) {

    //first of all, load the player's owned camels list
    var camelsData = loadCamelsData();

    if (camelsData == undefined || camelsData == null)
        return generateErrObj("Player's 'Camels' object was not found");

    var selectedCamel = camelsData.OwnedCamelsList[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    var serverTime = getServerTime();

    //check if camel is 'fully grown'
    if (Number(selectedCamel.BreedingCompletionTimestamp) > serverTime)
        return generateFailObj("Selected camel is not fully grown yet");

    //check if any camel is currently training
    for (var i = 0; i < camelsData.OwnedCamelsList.length; i++) {
        if (Number(camelsData.OwnedCamelsList[i].TrainingEnds) > 0)
            return generateFailObj("A camel is already training");
    }

    //make sure there is another available camel left after this one starts training
    var nrOfAvailableCamels = getNumberOfAvailableCamels(camelsData.OwnedCamelsList);

    if (nrOfAvailableCamels == undefined || nrOfAvailableCamels == null || isNaN(Number(nrOfAvailableCamels)) || Number(nrOfAvailableCamels) <= 1)
        return generateFailObj("Cannot train last available camel");

    //the training level for the given stat
    var currentLevel = Number(selectedCamel.TrainingLevels[args.statType]);

    //Now, load the balancing information to find out if next level would exceed level limit
    var trainingBalancing = loadTitleDataJson("Balancing_Training");

    if (trainingBalancing == undefined || trainingBalancing == null)
        return generateErrObj("Training Balancing JSON undefined or null");

    //check if limit information is defined
    if (trainingBalancing.TrainingLimits == undefined || trainingBalancing.TrainingLimits == null)
        return generateErrObj("Training Limits not defined");

    var trainingLimit = Number(trainingBalancing.TrainingLimits[selectedCamel.Quality]);

    if (trainingLimit == undefined || trainingLimit == null)
        return generateErrObj("Training limit for this quality not defined");

    if (currentLevel >= trainingLimit)
        return generateFailObj("Stat Training at max lvl");

    //if we got this far, the camel is not at max training level yet

    //check if training values are set for given stat, at current level
    if (trainingBalancing.TrainingStages == undefined || trainingBalancing.TrainingStages == null ||
        trainingBalancing.TrainingStages[currentLevel] == undefined || trainingBalancing.TrainingStages[currentLevel] == null)
        return generateErrObj("Training values not found");

    var trainingValues = trainingBalancing.TrainingStages[currentLevel];

    //Now, pay the virtual currency cost
    var VirtualCurrencyObject = payCurrency(trainingValues.CostSC, trainingValues.CostHC);

    if (VirtualCurrencyObject == null)
        return generateFailObj("Can't afford training");

    //increment stat trained level
    selectedCamel.TrainingLevels[args.statType] = currentLevel + Number(1);

    //grant stat gains
    selectedCamel[args.statType] = Number(selectedCamel[args.statType]) + Number(trainingValues.StatGain);

    //Set current training type and wait time
    selectedCamel.CurrentlyTrainingStat = args.statType;
    selectedCamel.TrainingEnds = serverTime + Number(trainingValues.WaitTimeMins) * Number(60);

    //TODO increment camel value

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsData) }
    });

    return {
        Result: "OK",
        CamelData: selectedCamel,
        VirtualCurrency: VirtualCurrencyObject
    }
}

//args.camelIndex
//args.qteOutcome index (0-perfect,4-Slow)
handlers.finishTraining = function (args, context) {

    //first of all, load the player's owned camels list
    var camelsData = loadCamelsData();

    if (camelsData == undefined || camelsData == null)
        return generateErrObj("Player's 'Camels' object was not found");

    var selectedCamel = camelsData.OwnedCamelsList[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + " not found.");

    //make sure the selected camel is eligible for finishing training
    if (selectedCamel.CurrentlyTrainingStat == "none" || isNaN(Number(selectedCamel.TrainingEnds)) || Number(selectedCamel.TrainingEnds <= 0 || Number(selectedCamel.TrainingEnds > getServerTime()))) {
        return generateFailObj("Camel cannot finish training");
    }

    //camel eligible to finish training

    //Now, load the balancing information to find out how much extra stats does the camel receive
    var trainingBalancing = loadTitleDataJson("Balancing_Training");

    if (trainingBalancing == undefined || trainingBalancing == null)
        return generateErrObj("Training Balancing JSON undefined or null");

    //check if qte bonuses information is defined
    if (trainingBalancing.QteBonuses == undefined || trainingBalancing.QteBonuses == null)
        return generateErrObj("Training Qte bonuses not defined or corrupt");

    var statBonus = Number(0);
    if (trainingBalancing.QteBonuses.length > 0 && trainingBalancing.QteBonuses.length > Number(args.qteOutcome))
        statBonus = Number(trainingBalancing.QteBonuses[Number(args.qteOutcome)]);

    //increment the stat by the value defined in the balancing
    selectedCamel[selectedCamel.CurrentlyTrainingStat] = Number(selectedCamel[selectedCamel.CurrentlyTrainingStat]) + statBonus;

    //reset the training timestamp
    selectedCamel.TrainingEnds = 0;
    selectedCamel.CurrentlyTrainingStat = "none";

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsData) }
    });

    return {
        Result: "OK",
        BonusStat: statBonus,
        CamelData: selectedCamel
    }
}//Upgrades the given item on a camel
//
//Arguments
//args.camelIndex
//args.itemType
handlers.upgradeCamelItem = function (args, context) {

    //first of all, load the player's owned camels list
    var camelsData = loadCamelsData();
    if (camelsData == undefined || camelsData == null)
        return generateErrObj("Player's 'Camels' object was not found");

    var selectedCamel = camelsData.OwnedCamelsList[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    var currentLevel = Number(selectedCamel[args.itemType]);


    //Now, load the balancing information to find out if next level would exceed level limit
    var upgradeBalancing = loadTitleDataJson("Balancing_Upgrade");

    if (upgradeBalancing == undefined || upgradeBalancing == null)
        return generateErrObj("Upgrade Balancing JSON undefined or null");

    //check if limit information is defined
    if (upgradeBalancing.UpgradeLimits == undefined || upgradeBalancing.UpgradeLimits == null)
        return generateErrObj("Upgrade Limits not defined");

    var upgradeLimit = Number(upgradeBalancing.UpgradeLimits[selectedCamel.Quality]);

    if (upgradeLimit == undefined || upgradeLimit == null)
        return generateErrObj("Upgrade limit for this quality not defined");

    if (currentLevel >= upgradeLimit)
        return generateFailObj("Item at max lvl");

    //if we got this far, the camel is not at max level yet

    //check if upgrade values are set for given item, at current level
    if (upgradeBalancing[args.itemType] == undefined || upgradeBalancing[args.itemType] == null ||
        upgradeBalancing[args.itemType][currentLevel] == undefined || upgradeBalancing[args.itemType][currentLevel] == null)
        return generateErrObj("Upgrade values not found");

    var upgradeValues = upgradeBalancing[args.itemType][currentLevel];

    //Now, pay the virtual currency cost
    var VirtualCurrencyObject = payCurrency(upgradeValues.CostSC, upgradeValues.CostHC);

    if (VirtualCurrencyObject == null)
        return generateFailObj("Can't afford upgrade");

    //increment item level
    selectedCamel[args.itemType] = currentLevel + Number(1);

    //grant stat gains
    var splitStats = upgradeValues.StatBonuses.split(",");

    //Acceleration
    if (splitStats.length > 0 && !isNaN(Number(splitStats[0])) && Number(splitStats[0]) > 0)
        selectedCamel.Acceleration += Number(splitStats[0]);

    //Speed
    if (splitStats.length > 1 && !isNaN(Number(splitStats[1])) && Number(splitStats[1]) > 0)
        selectedCamel.Speed += Number(splitStats[1]);

    //Gallop
    if (splitStats.length > 2 && !isNaN(Number(splitStats[2])) && Number(splitStats[2]) > 0)
        selectedCamel.Gallop += Number(splitStats[2]);

    //Stamina
    if (splitStats.length > 3 && !isNaN(Number(splitStats[3])) && Number(splitStats[3]) > 0)
        selectedCamel.Stamina += Number(splitStats[3]);

    //TODO increment camel value

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsData.playerCamels) }
    });

    return {
        Result: "OK",
        CamelData: playerCamels,
        VirtualCurrency: VirtualCurrencyObject
    }
}
handlers.grantOasis = function (args, context) {

    //first of all, let's load the oasis balancing variables
    var oasisBalancing = loadTitleDataJson("Balancing_Oasis");

    if (oasisBalancing == undefined || oasisBalancing == null)
        return generateErrObj("Oasis Balancing JSON undefined or null");

    //balancing loaded correctly

    //get the timestamp of the next oasis
    var nextOasisTimestamp = getNextOasisTime(oasisBalancing.rechargeInterval);

    //correctly loaded next oasis timestamp

    //check if the wait time has passed for the oasis
    var serverTime = getServerTime();

    if (nextOasisTimestamp > serverTime) {
        //time not elapsed yet. Return failed status with the timestamp of the next oasis in the 'Data' field.
        return generateFailObj("Oasis not ready yet", nextOasisTimestamp);
    }

    //the oasis is ready to be granted

    //calculate rewards
    var scReward = randomRange(oasisBalancing.scRewardBase, oasisBalancing.scRewardBase * 2);
    var hcReward = randomRange(oasisBalancing.hcRewardMin, oasisBalancing.hcRewardMax);
    var tkReward = randomRange(oasisBalancing.ticketsRewardMin, oasisBalancing.ticketsRewardMax);

    //increment virtual currency
    addCurrency("SC", scReward);
    addCurrency("HC", hcReward);
    addCurrency("TK", tkReward);

    //update the player's last claimed oasis timestamp
    server.UpdateUserReadOnlyData(
            {
                PlayFabId: currentPlayerId,
                Data: { "lastClaimedOasisTimestamp": serverTime }
            }
        );

    var VirtualCurrencyObject = server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency;

    //return new timestamp and new inventory
    return {
        Result: "OK",
        NextOasisTime: serverTime + Number(oasisBalancing.rechargeInterval) * 3600,
        VirtualCurrency: VirtualCurrencyObject
    }
}

handlers.getOasisData = function (args, context) {

    //first of all, let's load the oasis balancing variables
    var oasisBalancing = loadTitleDataJson("Balancing_Oasis");

    if (oasisBalancing == undefined || oasisBalancing == null)
        return generateErrObj("Oasis Balancing JSON undefined or null");

    return {
        Result: "OK",
        NextOasisTime: getNextOasisTime(oasisBalancing.rechargeInterval)
    }
}

//get the timestamp of the next oasis
function getNextOasisTime(oasisWaitTime) {

    //load the player's oasis data
    var lastOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["lastClaimedOasisTimestamp"]
    });

    var lastClaimedOasisTimestamp = 0;

    if (lastOasis.Data.lastClaimedOasisTimestamp != undefined && lastOasis.Data.lastClaimedOasisTimestamp.Value != undefined) {
        lastClaimedOasisTimestamp = Number(lastOasis.Data.lastClaimedOasisTimestamp.Value);
    }

    return lastClaimedOasisTimestamp + Number(oasisWaitTime) * 3600;
}
handlers.claimLevelUpReward = function (args, context) {
    //First off, load the player's level progress from read-only data
    var playerLevelProgress = server.GetUserReadOnlyData(
{
    PlayFabId: currentPlayerId,
    Keys: ["LevelProgress"]
});

    if (playerLevelProgress == undefined || playerLevelProgress == null || playerLevelProgress.Data.LevelProgress == undefined || playerLevelProgress.Data.LevelProgress == null)
        return generateErrObj("LevelProgress object undefined or null");

    var playerLevelProgressJSON = JSON.parse(playerLevelProgress.Data.LevelProgress.Value);

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
handlers.raceEnd = function (args, context) {

    if (args != null && args.endRaceReward && Number(args.endRaceReward)) {
        addCurrency("SC", Number(args.endRaceReward));
    }

    return { Result: "OK" };
}

//Arguments
//args.camelIndex
//args.finishPosition - placement of player (0- first, 1-seconds etc)
//args.startQteOutcome - outcome of the start qte (0-perfect, 1-great, 2-good etc)
//args.finishSpeedFactor - speed factor when crossing finish line (0-top speed, 1-top speed+max boost speed bonus)
handlers.endRace_quick = function (args, context) {

    //first we load the race reward parameters for the quick race.
    var raceRewardJSON = loadTitleDataJson("RaceRewards_Quick");

    if (raceRewardJSON == undefined || raceRewardJSON == null)
        return generateErrObj("RaceRewards_Quick JSON undefined or null");

    //calculate sc bonus based on player level
    var scBonusFromLevel = Number(0);
    if (raceRewardJSON.ScBonusPerPlayerLevel != undefined && raceRewardJSON.ScBonusPerPlayerLevel != null && raceRewardJSON.ScBonusPerPlayerLevel.length > args.finishPosition)
        scBonusFromLevel = Number(raceRewardJSON.ScBonusPerPlayerLevel[args.finishPosition]);

    //calculate and give rewards based on placement, start qte, finish speed
    var errorMessage = GiveRaceRewards(args, raceRewardJSON, scBonusFromLevel);

    //check for errors
    if (errorMessage != null)
        return generateErrObj(errorMessage);

    //update camel statistics
    var camelObject = CamelFinishedRace(args, args.camelIndex);

    //return new currency balance
    return {
        Result: "OK",
        CamelData: camelObject,
        VirtualCurrency: server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency
    }
}

//Arguments
//arg.seriesIndex - index of the series
//arg.eventIndex - index of the event
//arg.finishPosition - placement of player (0- first, 1-seconds etc)
//arg.startQteOutcome - outcome of the start qte (0-perfect, 1-great, 2-good etc)
//arg.finishSpeedFactor - speed factor when crossing finish line (0-top speed, 1-top speed+max boost speed bonus)
handlers.endRace_event = function (args, context) {

    //first we load the race reward parameters from the title data
    var eventRewardsJSON = loadTitleDataJson("RaceRewards_Events");

    if (eventRewardsJSON == undefined || eventRewardsJSON == null)
        return generateErrObj("RaceRewards_Events JSON undefined or null");

    //cache the series json
    var seriesJSON = eventRewardsJSON[args.seriesIndex];

    //check the series index exists
    if (seriesJSON == undefined || seriesJSON == null)
        return generateErrObj("Series with index: " + args.seriesIndex + " not found");

    //check if the list of events exists
    if (seriesJSON.EventsList == undefined || seriesJSON.EventsList == null)
        return generateErrObj("List of events not found for series with index: " + args.seriesIndex);

    //at this point, we have found the series and the list of events for that series, we don't need the entire eventRewardsJSON any more.
    eventRewardsJSON = null;

    //now, we need to check if the player is eligible for this reward

    //initialize the reached season and event values to 0 (in case they do not exist yet)
    var currSeries = Number(0);
    var currEvent = Number(0);

    //read the 'CurrentSeries' and 'CurrentEvent' variable from player's read-only data
    var playerData = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["CurrentSeries", "CurrentEvent"]
    });

    if (playerData.Data.CurrentSeries != undefined && playerData.Data.CurrentSeries != null && !isNaN(playerData.Data.CurrentSeries.Value)) {
        currSeries = Number(playerData.Data.CurrentSeries.Value);
    }

    if (playerData.Data.CurrentEvent != undefined && playerData.Data.CurrentEvent != null && !isNaN(playerData.Data.CurrentEvent.Value)) {
        currEvent = Number(playerData.Data.CurrentEvent.Value);
    }

    //check if player is eligible for reward
    if (currSeries != args.seriesIndex || currEvent != args.eventIndex)
        return generateFailObj("Player is not eligible for this event");

    //calculate and give rewards based on placement, start qte, finish speed
    var errorMessage = GiveRaceRewards(args, seriesJSON.EventsList[args.eventIndex]);

    //give experience
    var newLevelProgress = null;

    //check for errors
    if (errorMessage != null)
        return generateErrObj(errorMessage);

    //update camel statistics
    var camelObject = CamelFinishedRace(args, args.camelIndex);

    //if the player won, increment the current event value
    if (args.finishPosition == 0) {
        //increment series and set event to 0, if event was last in the list
        if (args.eventIndex == seriesJSON.EventsList.length) {

            //TODO here we give the series completion reward for the currSeries

            currSeries++;
            currEvent = 0;
        } else {
            currEvent++;
        }

        //Grant Experience
        newLevelProgress = addExperience(seriesJSON.EventsList[args.eventIndex].ExpGain);
    }

    //update the current season and event values in the player's read-only data
    server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "CurrentSeries": currSeries, "CurrentEvent": currEvent }
        }
    );

    //return the updated virtual currency and current series/event values
    return {
        Result: "OK",
        CamelData: camelObject,
        VirtualCurrency: server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency,
        CurrentSeries: currSeries,
        CurrentEvent: currEvent,
        LevelProgress: newLevelProgress
    }
}

function GiveRaceRewards(args, raceRewardJSON, playerLevelBonusSC) {

    var scReward = Number(0);
    var hcReward = Number(0);
    var tkReward = Number(0);

    //check if JSON is valid
    if (raceRewardJSON.Placement_SC == undefined || raceRewardJSON.Placement_HC == undefined || raceRewardJSON.Placement_TK == undefined)
        return "race rewards JSON is not valid";

    //Placement SC
    var placementRwrd_SC = raceRewardJSON.Placement_SC[args.finishPosition];
    if (placementRwrd_SC != undefined && placementRwrd_SC != null && !isNaN(Number(placementRwrd_SC))) {
        //there a reward defined for this placement
        scReward += Number(placementRwrd_SC);
    };

    //Placement HC
    var placementRwrd_HC = raceRewardJSON.Placement_HC[args.finishPosition];
    if (placementRwrd_HC != undefined && placementRwrd_HC != null && !isNaN(Number(placementRwrd_HC))) {
        //there a reward defined for this placement
        hcReward += Number(placementRwrd_HC);
    };

    //Placement TK
    var placementRwrd_TK = raceRewardJSON.Placement_TK[args.finishPosition];
    if (placementRwrd_TK != undefined && placementRwrd_TK != null && !isNaN(Number(placementRwrd_TK))) {
        //there a reward defined for this placement
        tkReward += Number(placementRwrd_TK);
    };

    //TODO actually use the start qte outcome index to modify the scReward value
    //SC from start qte
    if (!isNaN(Number(raceRewardJSON.MaxStartBonus)))
        scReward += Number(raceRewardJSON.MaxStartBonus);

    //SC from finish speed
    if (!isNaN(Number(args.finishSpeedFactor)) && !isNaN(Number(raceRewardJSON.MaxFinishBonus)))
        scReward += Math.round(Number(raceRewardJSON.MaxFinishBonus) * Number(args.finishSpeedFactor));

    //SC from player level bonus
    if (playerLevelBonusSC != undefined && playerLevelBonusSC != null && !isNaN(Number(playerLevelBonusSC)))
        scReward += Number(playerLevelBonusSC);

    //Give currencies to player
    if (scReward > 0)
        addCurrency("SC", scReward);

    if (hcReward > 0)
        addCurrency("HC", hcReward);

    if (tkReward > 0)
        addCurrency("TK", tkReward);

    return null;
}

//this function will do all the operations on the camel that finished the race (update statistics, decrement steroids charges etc)
function CamelFinishedRace(args, camelIndex) {

    //first of all, load the player's owned camels list
    var camels = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["Camels"]
    });

    //check existance of Camels object
    if ((camels.Data.Camels == undefined || camels.Data.Camels == null))
        return;

    var camelsJSON = JSON.parse(camels.Data.Camels.Value);
    var camelObject = camelsJSON.OwnedCamelsList[camelIndex];

    //check validity of JSON
    if (camelObject == undefined || camelObject == null)
        return;

    //decrement steroid charges
    if (Number(camelObject.SteroidsLeft) > Number(1))
        camelObject.SteroidsLeft = Number(camelObject.SteroidsLeft) - Number(1);

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsJSON) }
    });

    return camelObject;
}
