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
