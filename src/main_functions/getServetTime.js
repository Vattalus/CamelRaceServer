handlers.getServerTime = function(args, context)
{
	var t = new Date();
	return { time: t};
}
