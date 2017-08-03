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
