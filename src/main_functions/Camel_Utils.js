//Load camel data
function loadOwnedCamels() {

    var camels = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["OwnedCamels"]
    });

    //check existance of Camels object
    if ((camels.Data.OwnedCamels == undefined || camels.Data.OwnedCamels == null))
        return null;

    var ownedCamelsJSON = JSON.parse(camels.Data.OwnedCamels.Value);

    if (ownedCamelsJSON == undefined || ownedCamelsJSON == null)
        return null;

    return ownedCamelsJSON;
}

//Generate new camel

//args.baseAcc
//args.baseSpeed
//args.baseGallop
//args.baseStamina
function createEmptyCamelProfile(args) {
    var newCamelJson = {
        "Name": "CamelName",
        "Number" : "00",
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

        "Customization": createEmptyCustomizationObject()
    }

    log.debug("Acc: " + args.baseAcc + " Spd: " + args.baseSpeed);

    //apply provided base stats
    if (args.baseAcc != undefined && args.baseAcc != null) {
        newCamelJson.baseAcc = args.baseAcc;
        newCamelJson.Acceleration = args.baseAcc;
    }

    if (args.baseSpeed != undefined && args.baseSpeed != null) {
        newCamelJson.baseSpeed = args.baseSpeed;
        newCamelJson.Speed = args.baseSpeed;
    }

    if (args.baseGallop != undefined && args.baseGallop != null) {
        newCamelJson.baseGallop = args.baseGallop;
        newCamelJson.Gallop = args.baseGallop;
    }

    if (args.baseStamina != undefined && args.baseStamina != null) {
        newCamelJson.baseStamina = args.baseStamina;
        newCamelJson.Stamina = args.baseStamina;
    }

    return newCamelJson;
}

function createEmptyCustomizationObject() {
    return {
        "CamelModel": "Basic",
        "CamelSeed": 0,
        "Saddle": "Basic",
        "Robot": "Basic",
        "Hat": "Basic",
        "Shoes": "Basic"
    }
}

//returns the number of camels that the player can actually use at the moment
function getNumberOfAvailableCamels(ownedCamelsListJSON) {

    if (ownedCamelsListJSON == undefined || ownedCamelsListJSON == null || Number(ownedCamelsListJSON.length) <= 0) //provided list is corrupted or empty
        return 0;

    var serverTime = getServerTime();

    var availableCamels = 0;

    for (var i = 0; i < ownedCamelsListJSON.length; i++) {

        //skip if not 'fully grown'
        if (Number(ownedCamelsListJSON[i].BreedingCompletionTimestamp) > serverTime)
            continue;

        //skip if camel is currently training
        if (Number(ownedCamelsListJSON[i].TrainingEnds) > 0)
            continue;

        availableCamels++;
    }

    return availableCamels;
}
