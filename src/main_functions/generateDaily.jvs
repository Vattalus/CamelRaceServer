handlers.generateDaily = function(args, context) 
{
	var DailyStatus = 1; //0 <- waiting for daily timer, 1 <- generate daily, 2 <- daily is ongoing
	var DailyMissionClaimStatus = [0,0,0,0,0,0,0,0];
	var d = new Date();

	var dStatus = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["DailyMissionStatus"]
	});

	if(dStatus.Data.DailyMissionStatus != undefined)
	{
	    var parsedData = JSON.parse(dStatus.Data.DailyMissionStatus.Value);
		DailyStatus = Number(parsedData.DailyStatus);

		if(DailyStatus == 0) // we only check if status should be 1 from status 0
		{
	      var tData = server.GetTitleData(
	        {
	          PlayFabId : currentPlayerId,
	          Keys : ["DailyMissionData"]
	        }
	      );
	      var totalMinutes = 600;
	      tParsed = JSON.parse(tData.Data.DailyMissionData);
	      totalMinutes = Number(tParsed.minutesToRefresh);

	      var d = new Date();
	      if(d.getTime() - Number(parsedData.timeStamp) > Number(totalMinutes) *60*1000) // minutes *60*1000
	      {
	      	DailyStatus = 1; // time's up we have to tell the client that it is time to generate a new daily
	      }
	  	}

		if(DailyStatus != 1)
			return generateErrObj("DailyStatus is: " + DailyStatus + ". Should be 1");
	}

	DailyStatus = 2; //we are now in ongoing mode
	var timeStamp = d.getTime();
	var dailyObject = 
	{
		"DailyStatus" : DailyStatus,
		"dailyMissionClaimStatus" : DailyMissionClaimStatus,
		"timeStamp" : timeStamp
	};
	var dailyObjectStringified = JSON.stringify(dailyObject);
	var objectToUpdate = 
	{
		"DailyMissionStatus" : dailyObjectStringified
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
