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
        "CurrentAcc": 0,
        "CurrentSpeed": 0,
        "CurrentGallop": 0,
        "CurrentStamina": 0,
        //item levels
        "HeadGear": 0,
        "Robot": 0,
        "Whip": 0,
        "Robe": 0,
        "Bridle": 0,
        //steroids
        "SteroidsLeft": 0,
        //training
        "AccTrained": 0,
        "SpeedTrained": 0,
        "GallopTrained": 0,
        "StaminaTrained": 0,
        //current training
        "CurrentTrainingType": "none",
        "TrainingEnds": 0,
        //Value
        "CamelValue": 0,

        "BreedingCompletionTimestamp": 0, //wait timer used for newly bred camels

        //TODO camel visual traits (seed)
        //TODO camel customization
    }

    //apply provided base stats
    if (args.baseAcc != undefined && args.baseAcc != null) {
        newCamelJson.BaseAcc = args.baseAcc;
        newCamelJson.CurrentAcc = args.baseAcc;
    }

    if (args.baseSpeed != undefined && args.baseSpeed != null) {
        newCamelJson.BaseSpeed = args.baseSpeed;
        newCamelJson.CurrentSpeed = args.baseSpeed;
    }

    if (args.baseGallop != undefined && args.baseGallop != null) {
        newCamelJson.BaseGallop = args.baseGallop;
        newCamelJson.CurrentGallop = args.baseGallop;
    }

    if (args.baseStamina != undefined && args.baseStamina != null) {
        newCamelJson.BaseStamina = args.baseStamina;
        newCamelJson.CurrentStamina = args.baseStamina;
    }

    return newCamelJson;
}
