handlers.getDailyMissionStatus = function(args, context) {

  	//var mC = CheckMaintenanceAndVersion(args);
  	//if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
  	var mC = CheckMaintenanceAndVersion(args);
  	if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
  	
	var DailyStatus = 2; //0 <- waiting for daily timer, 1 <- generate daily, 2 <- daily is ongoing
	var DailyMissionClaimStatus = [0,0,0,0,0,0,0,0];
	var TimeRemaining = -1;
	var dStatus = server.GetUserInternalData(
	{
	    PlayFabId: currentPlayerId,
	    Keys: ["DailyMissionStatus"]
	});

	if(dStatus.Data.DailyMissionStatus != undefined)
	{
		var parsedData = JSON.parse(dStatus.Data.DailyMissionStatus.Value);
		DailyStatus = Number(parsedData.DailyStatus);	
		var tempLength = DailyMissionClaimStatus.length;
		if(tempLength > parsedData.dailyMissionClaimStatus.length) tempLength = parsedData.dailyMissionClaimStatus.length;
		for(var i = 0; i < tempLength; i++)
		{
			DailyMissionClaimStatus[i] = parsedData.dailyMissionClaimStatus[i];
		}

		if(DailyStatus == 0) // we only return remaining time till next quest if status is waiting for daily timer
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
	      	DailyStatus = 2; // time's up we have to  generate a new daily
	      	DailyMissionClaimStatus = [0,0,0,0,0,0,0,0];
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
	      }
	      else
	      {
	      	TimeRemaining = (Number(totalMinutes) *60) - (Math.floor((d.getTime() - Number(parsedData.timeStamp))/1000)); // time remaining till next quest in seconds
	      }
		}
	}
	else
	{
		DailyStatus = 2; //we are now in ongoing mode
		var d = new Date();
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
	}
	var dStObj = 
	{
		status : DailyStatus,
		claimStatus : DailyMissionClaimStatus,
		timeRemaining : TimeRemaining
	};
	var r = 
	{
    	"Result": "OK",
    	"Message": " ",
    	"DailyStatus":dStObj
  	};
  	return r;
}
