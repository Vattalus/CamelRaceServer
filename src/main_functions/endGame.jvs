handlers.endGame = function(args, context) {
  
  var mC = CheckMaintenanceAndVersion(args);
  if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
  //let's get some relevant title wide data
    var titleDataRequest = server.GetTitleData(
    {
      Key: ["LeagueSubdivisions","SubdivisionTrophyRanges", "RecUploadLock"]
    }
    );
  //let's update user trophies
  var trophyCount = 0;
  var initTrophyCount = 0;
  var tc=server.GetPlayerStatistics(
  {
     PlayFabId: currentPlayerId,
     StatisticNames: ["TrophyCount"]
  });
  if(tc.Statistics.length != 0)
  {
    trophyCount = tc.Statistics[0].Value;
    if(args.debug == true) log.debug("getting trophy count " + tc.Statistics[0].Value);
  }
  trophyCount = Number(trophyCount);
  initTrophyCount = trophyCount;
  var pDat = server.GetUserInternalData(
  {
    PlayFabId: currentPlayerId,
    Keys: ["trophyLose","trophyWin","LastGameOutcome", "LatestStreak"]
  });
  var refund;
  //log.debug("pDat.Data[trophyLose] " + pDat.Data["trophyLose"].Value);
  //log.debug("pDat.Data[trophyWin] " + pDat.Data["trophyWin"].Value);
  if((pDat.Data["trophyLose"] == undefined) || (pDat.Data["trophyWin"] == undefined)) refund = 45;
  else refund = Number(pDat.Data["trophyLose"].Value) + Number(pDat.Data["trophyWin"].Value);
  //log.debug("refund: " + refund);

//previous game data
  var latestStreak = 0;
  var lastMatchOutcome = "Loss";
  if(pDat.Data["LatestStreak"] != undefined) latestStreak = Number(pDat.Data["LatestStreak"].Value);
  if(isNaN(latestStreak) == true) latestStreak = 0;
  if(pDat.Data["LatestStreak"] != undefined) lastMatchOutcome = pDat.Data["LastGameOutcome"].Value;
  if(lastMatchOutcome == undefined) lastMatchOutcome = "Loss";
  
  var dataToUpdate = 
  {
     "quitLastGame" : "false",
     "LastGameOutcome" : "Loss"
  }


  if(args.outcome == "rWin")
  {
  		trophyCount += refund;
      dataToUpdate["LastGameOutcome"] = "Win";
      if(lastMatchOutcome == "Loss") latestStreak = 1;
      else latestStreak ++;  

      //Let's check the leaderboard and see if our player is in the top
      var isKing = false;
      ldata = server.GetLeaderboard(
      {
        StatisticName : "TrophyCount",
        StartPosition : 0,
        MaxResultsCount : 1
      });
      
      //this is for the livefeed
      if(ldata.Leaderboard != null)
      {
        if(args.debug == true) log.debug("leaderboardData: " + ldata.Leaderboard[0]);
        if(ldata.Leaderboard[0].PlayFabId == currentPlayerId) //looks like our player is already top of the leaderboard
        {
          if(args.debug == true) log.debug("ALREADY IN FIRST PLACE IN LEADERBOARD");
          isKing = true;
        }
        else
        {
          if(args.debug == true) log.debug("WASN'T FIRST PLACE");
          if(Number(ldata.Leaderboard[0].StatValue) < trophyCount) // he wasn't before but he sure is now
          {
            if(args.debug == true) log.debug("BUT HE IS NOW!");
            publishToLiveFeed(currentPlayerId, "topPlayer", trophyCount);
          }
          if(args.debug == true) log.debug("DIFF: " + Number(ldata.Leaderboard[0].StatValue) + " vs " + trophyCount);
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
  var ms=server.GetPlayerStatistics( //miscelanious statistics
  {
     PlayFabId: currentPlayerId,
     StatisticNames: ["Wins", "TotalGamesCompleted","LongestWinStreak","BestDriftScore", "HighestLeagueReached", "TotalGames"]
  }).Statistics;
  var cLeague = calculateLeague(trophyCount);
  var totalGamesCompleted = GetValueFromStatistics(ms, "TotalGamesCompleted", 0);
  var isTutorial = false;
  var totalGamesStarted = GetValueFromStatistics(ms, "TotalGames", 0);
  if(Number(totalGamesStarted) <= 1) isTutorial = true;


  totalGamesCompleted = Number(totalGamesCompleted) + 1;
  var totalWins = GetValueFromStatistics(ms, "Wins", 0);
  if(args.outcome == "rWin")
    totalWins = Number(totalWins) + 1;
  var longestStreak = GetValueFromStatistics(ms, "LongestWinStreak", 0);
  var longestStreakVersion = GetVersionFromStatistics(ms, "LongestWinStreak", 0);
  if(Number(longestStreak) < latestStreak) 
  {    
    longestStreak = latestStreak;
    if(cLeague > 2)
    {
      if(Number(longestStreak) == 10)
        publishToLiveFeed(currentPlayerId, "winStreak", 10);
      if(Number(longestStreak) == 15)
        publishToLiveFeed(currentPlayerId, "winStreak", 15);
      if(Number(longestStreak) == 20)
        publishToLiveFeed(currentPlayerId, "winStreak", 20);
    }
  }
  var bestScore = GetValueFromStatistics(ms, "BestDriftScore", 0);
  if(Number(recHeader.Score) > bestScore)
    bestScore = Number(recHeader.Score);
  //log.debug("trophies change: " + initTrophyCount + " => " + trophyCount);

  var highestLeague = GetValueFromStatistics(ms, "HighestLeagueReached", 1);
  if(Number(cLeague) > Number(highestLeague)) 
    {
      highestLeague = cLeague;
      if(highestLeague > 2)
      {
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
  var sut = {StatisticName : "TrophyCount", Value: trophyCount};
  suArray.push(sut);
  var sul = {StatisticName : "League", Value: cLeague};
  suArray.push(sul);
    var suw = {StatisticName : "Wins", Value: totalWins};
  suArray.push(suw);
    var sutg = {StatisticName : "TotalGamesCompleted", Value: totalGamesCompleted};
  suArray.push(sutg);
    var sulws = {StatisticName : "LongestWinStreak", Value: longestStreak};
  suArray.push(sulws);
    var subds = {StatisticName : "BestDriftScore", Value: bestScore};
  suArray.push(subds);
    var subhlr = {StatisticName : "HighestLeagueReached", Value: highestLeague};
  suArray.push(subhlr);
  var updateRequest = server.UpdatePlayerStatistics(
  {
    PlayFabId: currentPlayerId,
    Statistics: suArray
  }
  );

  //stats have been updated, now let's grant the user a chest
  if(args.outcome == "rWin")
  {
    if(isTutorial == false) // we already gave him his tutorial chest
    {
      if(Number(totalGamesCompleted) > 4)
        grantUserChest(currentPlayerId, "endGameNormal");
      else
        grantUserChest(currentPlayerId, "endGameFreeWin");
    }
  }

  var uploadLock = false;//array of versions that cannot upload
  var RecUploadLockParsed;
  if(titleDataRequest.Data["RecUploadLock"] != undefined)
  {
    RecUploadLockParsed = JSON.parse(titleDataRequest.Data["RecUploadLock"]);
  }
  
  if(RecUploadLockParsed != undefined)
    for(var i = 0; i < RecUploadLockParsed.length; i++)
    {
      if(args.cVersion == RecUploadLockParsed[i])
      {
        uploadLock = true;
        break;
      }
    } 
  //if(Number(recHeader.Score) <= 100)
    if((Number(recHeader.Score) <= 100) || (uploadLock == true))
      {
        if(args.debug == true) log.debug("this recording will not be stored, but endgame stats still apply. clientVersion: " + args.cVersion + ". upload lock:  " + uploadLock);
          var newPlayerStats =
          {
            "TrophyCount" : trophyCount,
            "League" : cLeague
          }
          return {Result : newPlayerStats};
      }
  //let's see which Subdivision this player is in
  var sdval = titleDataRequest.Data["SubdivisionTrophyRanges"];
  var sdvalParsed = JSON.parse(sdval);
  //log.debug("SubdivisionTrophyRanges " + sdvalParsed);
  var subDivision = 43;
  for(var i = 0; i < sdvalParsed.subdivisions.length; i++)
  {
  	if(initTrophyCount<sdvalParsed.subdivisions[i])
  	{
		subDivision = i;
		break;
  	}
  }
//log.debug("user is in subdivision " + subDivision);
	//let's save the player's recording
 var dict = [];
    dict.push({
        Key:   args.envIndex+"_"+args.courseIndex+"_RecPos",
        Value: args.recordingPos
    });
      dict.push({
            Key:  args.envIndex+"_"+args.courseIndex+"_RecRot",
        Value: args.recordingRot
    });
       dict.push({
            Key:  args.envIndex+"_"+args.courseIndex+"_RecHeader",
        Value: args.recordingHeader
    });
       //log.debug("updating user read only data ");
  var playerData = server.UpdateUserReadOnlyData(
    {
      PlayFabId: currentPlayerId,
      Data:dict
    }
  );

  //log.debug("updated user read only data for " + currentPlayerId + " " + playerData);
  var titleDataVal = server.GetTitleInternalData(
    {
      Key: "RecSubDivision"+subDivision, //i.e RecSubDivision0,
    }
    );
  var recPool = titleDataVal.Data["RecSubDivision"+subDivision];
  //log.debug("recPool: " + recPool);
  var recArray;
  var titleKeyVal;
  if(recPool == undefined)
  {
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
  else
  {
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
    for(var i = 0; i < recArray.length; i++)
    {
      if(recArray[i].uId == currentPlayerId)
        currentOccurencesOfPlayer++;
    }
    if(currentOccurencesOfPlayer > 2) // no use letting the user spam his recordings on the same subdivision
    {
      var newPlayerStats =
      {
          "TrophyCount" : trophyCount,
          "League" : cLeague
      }
      return {Result : newPlayerStats};
    }

  	for(var i = 0; i < recArray.length; i++)
  	{
  		if((recArray[i].e == args.envIndex)&&(recArray[i].c == args.courseIndex))
  		{
			 uniqueKeyExists = true;
			 recArray[i] = recObj;
  		}
  	}
  	if(uniqueKeyExists == false)
  	{
  	 // log.debug("recArrayLNbefore: " + recArray.length);
  	  recArray.push(recObj);
  	  //log.debug("recArrayLNafter: " + recArray.length);
    }
  	titleKeyVal = JSON.stringify(recArray);
  //	log.debug("titleKeyVal: " + titleKeyVal);
  }

  var titleData = server.SetTitleInternalData(
    {
      Key: "RecSubDivision"+subDivision, //Recording_0_0
      Value: titleKeyVal
    }
    );
   var newPlayerStats =
     {
          "TrophyCount" : trophyCount,
          "League" : cLeague
      };
  return {Result : newPlayerStats};
}
