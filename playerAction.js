const studyUntilHackLevel = 50;

/** @param {NS} ns **/
export async function main(ns) {
  ns.disableLog("ALL");

  while (true) {
    ns.print("");

    var sleepTime = 5000;
    var player = ns.getPlayer();
    let currentWork = ns.singularity.getCurrentWork();
    getPrograms(ns, player);

    joinFactions(ns);

    buyAugments(ns, player);
    upgradeHomeServer(ns, player);

    var factionsForReputation = getFactionsForReputation(ns, player);
    ns.print("Factions for Reputation: " + [...factionsForReputation.keys()]);

    var actionUseful = currentActionUseful(ns, player, factionsForReputation,currentWork);
    ns.print("Current action useful: " + actionUseful);

    if (!actionUseful) {
      sleepTime = chooseAction(ns, sleepTime, player, factionsForReputation);
    }

    ns.print("WorkFactionName: " + currentWork.factionName)
    ns.print("WorkFactionDescription: " + currentWork.factionWorkType)
    ns.print("workType: " + currentWork.type)
    ns.print("companyName: " + currentWork.companyName)
    ns.print("jobs: " + JSON.stringify(player.jobs))
    //ns.print("Corps to work for: " + getCorpsForReputation(factionsForReputation))
    //ns.print("sleep for " + sleepTime + " ms")
    await ns.sleep(sleepTime);
  }
}

function upgradeHomeServer(ns, player) {
  //if (!ns.stock.hasTIXAPIAccess() && player.money > 30e9) {
  // TODO: Consider moving this to the trading script, fits better there (and saves ram here)
  // ns.purchase4SMarketDataTixApi();
  //}
  if (player.money > ns.singularity.getUpgradeHomeRamCost()) {
    if (!player.factions.includes("CyberSec") || ns.singularity.getUpgradeHomeRamCost() < 2e9
      || (ns.stock.hasTIXAPIAccess() && ns.singularity.getUpgradeHomeRamCost() < 0.2 * player.money)) {
      // Upgrade slowly in the first run while we save money for 4S or the first batch of augmentations
      // Assumption: We wont't join Cybersec after the first run anymore
      // ToDo: Beautification: At Max Home Server Ram, it still tries to upgrade RAM -> prevent that
      ns.print("Upgraded Home Server RAM");
      //ns.toast("Upgraded Home Server RAM");
      ns.singularity.upgradeHomeRam();
    }
  }
}

function getPrograms(ns, player) {

  if (!ns.hasTorRouter()) {
    if (player.money > 1700000) {
      ns.singularity.purchaseTor();
      ns.print("Purchased TOR");
      ns.toast("Purchased TOR");
    }
    else {
      return;
    }
  }

  ns.singularity.purchaseProgram("BruteSSH.exe");
  ns.singularity.purchaseProgram("FTPCrack.exe");
  ns.singularity.purchaseProgram("relaySMTP.exe");
  if (ns.stock.hasTIXAPIAccess()) {
    // do not buy more before 4s data access bought
    ns.singularity.purchaseProgram("HTTPWorm.exe");
    ns.singularity.purchaseProgram("SQLInject.exe");
  }

}

function chooseAction(ns, sleepTime, player, factions, currentWork) {
  var focus = ns.singularity.isFocused();
  //ns.print("Focus: " + focus);

  if (ns.getHackingLevel() < studyUntilHackLevel) {
    ns.singularity.universityCourse("rothman university", "Study Computer Science", focus);
  }
  else if (factions.size > 0) {
    var faction = factions.keys().next().value;
    const factionsFieldWork = ["Slum Snakes", "Tetrads"];
    var wType = "hacking";
    if (factionsFieldWork.includes(faction)) {
      wType = "field";
    }
    
    
    //{"type":"FACTION","cyclesWorked":532,"factionWorkType":"hacking","factionName":"BitRunners"}
    if (currentWork?.type != "FACTION"
      && currentWork.factionName != faction
      && currentWork.factionWorkType != wType) {
      const success = ns.singularity.workForFaction(faction, wType, focus);
      if (success) {
        ns.print("Start working for faction " + faction);
        ns.toast("Start working for faction " + faction, "success", 5000);
      }
      else {
        ns.print("Could not perform intended action: " + faction + " -> " + wType);
      }
    }
  }
  else if (player.hacking >= 250) {
    var corpsToWorkFor = getCorpsForReputation(ns, factions);
    //ns.print("Corps to work for: " + corpsToWorkFor);
    if (corpsToWorkFor.length > 0) {
      applyForPromotion(ns, player, corpsToWorkFor[0]);
      ns.print("Start working for " + corpsToWorkFor[0]);
      ns.toast("Start working for " + corpsToWorkFor[0]);
    }
  }
  else if (focus) {
    var crimeTime = commitCrime(ns, player);
    return crimeTime;
  }
  else {
    ns.toast("Crime Time! Please focus on something to start crimes.", "warning");
  }
  return sleepTime;
}

function applyForPromotion(ns, player, corp) {

  var career = "it"

  var success = ns.singularity.applyToCompany(corp, career);

  if (success) {
    ns.toast("Got a company promotion!");
  }
  ns.singularity.workForCompany(corp, ns.singularity.isFocused());
}

function currentActionUseful(ns, player, factions) {
  let work = ns.singularity.getCurrentWork();
  var playerControlPort = ns.getPortHandle(3); // port 2 is hack
  if (work.type == "FACTION") {
    if (factions.has(work.factionName)) {
      var factionRep = ns.singularity.getFactionRep(work.factionName);
      var repRemaining = factions.get(work.factionName) - factionRep;
      if (repRemaining > 0) {
        // working for a faction needing more reputation for augmentations
        if (playerControlPort.empty() && work.factionWorkType == "hacking") {
          // only write to ports if empty
          ns.print("ns.share() to increase faction reputation");
          playerControlPort.write(1);

        }
        else if (playerControlPort.empty()) {
          // only write to ports if empty
          playerControlPort.write(0);
        }
        // seems a cycle is .2 ms, so RepGainRate * 5 is gain per second
        var reputationTimeRemaining = repRemaining / ((factionRep / work.cyclesWorked) * 5);
        ns.print("Total Rep Target: "+factions.get(work.factionName));
        ns.print("Current Reputation: " + factionRep);
        ns.print("Reputation remaining: " + repRemaining);
        ns.print("Reputation Rate: " + ns.nFormat(repRemaining, "0a") + " in " + ns.nFormat(reputationTimeRemaining / 60, "0a") + " min");
        return true;
      }
      else {
        ns.print("Max Reputation @ " + work.factionName);
        ns.toast("Max Reputation @ " + work.factionName, "success", 5000);
        return false;
      }
    }
    else {
      if (playerControlPort.empty()) {
        // only write to ports if empty
        playerControlPort.write(0);
      }

    }

  }
  else { // not hacking for a faction
    if (playerControlPort.empty()) {
      // only write to ports if empty
      playerControlPort.write(0);
    }
  }
  if (player.workType == "Working for Company" && player.companyName != "") {
    // for unknown reasons it might happen to have the work type "working for company" without actually working for one
    // just to make sure, also check that we have a company.

    var reputationGoal = 200000; // 200 but some is lost when stop working ; 266667 
    // ToDo: except fulcrum + 66.666 k and bachman not hacked

    var reputation = ns.singularity.getCompanyRep(player.companyName) + (player.workRepGained * 3 / 4);
    ns.print("Company reputation: " + ns.nFormat(reputation, "0a"));
    if (factions.has(player.companyName)) {
      return false;
    }
    applyForPromotion(ns, player, player.companyName);
    return true;
  }
  if (player.workType == "Studying or Taking a class at university") {
    if (ns.getHackingLevel() < studyUntilHackLevel) {
      return true;
    }
  }
  return false;
}

function getFactionsForReputation(ns, player) {

  var factionsWithAugmentations = new Map();
  for (const faction of player.factions) {
    var maxReputationRequired = maxAugmentRep(ns, faction);
    if (ns.singularity.getFactionRep(faction) < maxReputationRequired) {
      factionsWithAugmentations.set(faction, maxReputationRequired);
    }
  }
  return factionsWithAugmentations;
}

function getCorpsForReputation(ns, factions) {
  var corpsWithoutFaction = []
  for (const corp of megaCorps) {
    if (!factions.has(corp) && maxAugmentRep(ns, corp) > 0) {
      corpsWithoutFaction.push(corp);
    }
  }
  return corpsWithoutFaction;
}

function buyAugments(ns, player) {

  var sortedAugmentations = [];

  for (const faction of player.factions) {
    var purchasedAugmentations = ns.singularity.getOwnedAugmentations(true);
    var augmentations = ns.singularity.getAugmentationsFromFaction(faction);
    var newAugmentations = augmentations.filter(val => !purchasedAugmentations.includes(val));
    for (const augmentation of newAugmentations) {
      if (ns.singularity.getAugmentationRepReq(augmentation) <= ns.singularity.getFactionRep(faction)) {
        sortedAugmentations.push([augmentation, ns.singularity.getAugmentationPrice(augmentation)]);
      }
    }
  }

  // costs are the second element in the 2d arrays
  sortedAugmentations.sort((a, b) => b[1] - a[1]);
  var augmentationCostMultiplier = 1;
  var preReqAugments = [];
  var skipAugments = [];
  var overallAugmentationCost = 0;
  for (var i = 0; i < sortedAugmentations.length; i++) {


    for (var preReqAug of ns.singularity.getAugmentationPrereq(sortedAugmentations[i][0])) {
      if (!preReqAugments.includes(preReqAug) && !purchasedAugmentations.includes(preReqAug)) {
        preReqAugments.push(preReqAug);
        //ns.print("move prereq aug: " + preReqAug + " before " + sortedAugmentations[i][0]);
        sortedAugmentations.splice(i, 0, [preReqAug, ns.singularity.getAugmentationPrice(preReqAug)]);
        //overallAugmentationCost += sortedAugmentations[i][1] * augmentationCostMultiplier;
        if (i >= 0) {
          i--;
        }
        //augmentationCostMultiplier *= 2;
      }
    }
    if (i >= 0) {
      if (i > 0 && sortedAugmentations[i][0] == sortedAugmentations[i - 1][0] || skipAugments.includes(sortedAugmentations[i][0])) {
        //ns.print("remove duplicate aug: " + sortedAugmentations[i][0]);
        sortedAugmentations.splice(i, 1);
        i--;
        continue;
      }
      else if (preReqAugments.includes(sortedAugmentations[i][0])) {
        //ns.print("skip prereq aug: " + sortedAugmentations[i][0]);
        skipAugments.push((sortedAugmentations[i][0]));
      }
      overallAugmentationCost += sortedAugmentations[i][1] * augmentationCostMultiplier;
      augmentationCostMultiplier *= 1.9;
    }
  }

  ns.print("Augmentation purchase order: " + sortedAugmentations)
  ns.print("Current augmentation purchase cost: " + ns.nFormat(overallAugmentationCost, "0.0a"));

  if (player.money > overallAugmentationCost) {
    // decide when it's time to install
    // buy augmentation list
    // buy flux governors
    // ns.installAugmentations(cbScript)
  }
}

function maxAugmentRep(ns, faction) {
  var purchasedAugmentations = ns.singularity.getOwnedAugmentations(true);
  var augmentations = ns.singularity.getAugmentationsFromFaction(faction);
  var newAugmentations = augmentations.filter(val => !purchasedAugmentations.includes(val));

  if (newAugmentations.length > 0) {
    // go for the last augmentation in the list. Assumption: Higher rep augs from follow-up factions
    var maxReputationRequired = 0;
    for (const augmentation of newAugmentations) {
      if (ignoreFactionAugs.has(faction)) {
        if (ignoreFactionAugs.get(faction) == augmentation) {
          // ignore some augmentations which we want to buy from later factions
          //ns.print("Ignore aug " + augmentation + " for faction " + faction)
          continue;
        }
      }
      maxReputationRequired = Math.max(maxReputationRequired, ns.singularity.getAugmentationRepReq(augmentation));
    }
    return maxReputationRequired;
    // go for the last augmentation in the list. Assumption: Higher rep augs from follow-up factions
    // some augs will be completely ignored however
    //return ns.getAugmentationRepReq(newAugmentations[newAugmentations.length - 1]);
  }
  return 0;
}

function joinFactions(ns) {
  /*
  const newFactions = ns.singularity.checkFactionInvitations();
  for (const faction of newFactions) {
    if (!cityFactions.includes(faction) && maxAugmentRep(ns, faction)) {
      ns.joinFaction(faction);
      ns.print("Joined " + faction);
    }
  }
  */
}

function commitCrime(ns, player, combatStatsGoal = 300) {
  // Calculate the risk value of all crimes

  ns.print("Karma: " + ns.heart.break());
  ns.print("Kills: " + player.numPeopleKilled);

  var bestCrime = "";
  var bestCrimeValue = 0;
  var bestCrimeStats = {};
  for (let crime of crimes) {
    let crimeChance = ns.singularity.getCrimeChance(crime);
    var crimeStats = ns.singularity.getCrimeStats(crime);
    if (crime == "Assassination" && player.numPeopleKilled < 30 && crimeChance > 0.98) {
      bestCrime = "Assassination";
      bestCrimeStats = crimeStats;
      break;
    }
    else if (crime == "Homicide" && player.numPeopleKilled < 30 && crimeChance > 0.98) {
      bestCrime = "Homicide";
      bestCrimeStats = crimeStats;
      break;
    }
    var crimeValue = 0;
    if (player.strength < combatStatsGoal) {
      crimeValue += 100000 * crimeStats.strength_exp;
    }
    if (player.defense < combatStatsGoal) {
      crimeValue += 100000 * crimeStats.defense_exp;
    }
    if (player.dexterity < combatStatsGoal) {
      crimeValue += 100000 * crimeStats.dexterity_exp;
    }
    if (player.agility < combatStatsGoal) {
      crimeValue += 100000 * crimeStats.agility_exp;
    }
    crimeValue += crimeStats.money;
    //ns.print(ns.nFormat(crimeChance,"0.00a")+"/"+ns.nFormat(crimeStats.time,"000a")+"|"+crimeStats.strength_exp + "|" + crimeStats.defense_exp + "|" + crimeStats.dexterity_exp + "|" + crimeStats.agility_exp + "|" + ns.nFormat(crimeStats.money,"0a")+"|"+crime);
    crimeValue = crimeValue * crimeChance / (crimeStats.time + 10);
    if (crimeValue > bestCrimeValue) {
      bestCrime = crime;
      bestCrimeValue = crimeValue;
      bestCrimeStats = crimeStats;
    }
  }

  ns.singularity.commitCrime(bestCrime);

  ns.print("Crime value " + ns.nFormat(bestCrimeValue, "0a") + " for " + bestCrime);
  return bestCrimeStats.time + 10;
}

var megaCorps = ["Clarke Incorporated", "Bachman & Associates", "OmniTek Incorporated", "NWO", "Fulcrum Secret Technologies", "Blade Industries",
  "ECorp", "MegaCorp", "KuaiGong International", "Four Sigma"];

var cityFactions = ["Sector-12", "Chongqing", "New Tokyo", "Ishima", "Aevum", "Volhaven"];

var crimes = ["Shoplift", "RobStore", "Mug", "Larceny", "Deal Drugs", "Bond Forgery", "Traffick Arms", "Homicide",
  "Grand Theft Auto", "Kidnap", "Assassination", "Heist"];

const ignoreFactionAugs = new Map([
  ["CyberSec", 'Cranial Signal Processors - Gen II'],
  ["NiteSec", 'DataJack'],
  ["The Black Hand", 'Embedded Netburner Module Core Implant'],
  ["Sector-12", 'Neuralstimulator'],
])

/*
TODO: Implement creating programs manual in the first run
createProgram()
BruteSSH.exe: 50
FTPCrack.exe: 100
relaySMTP.exe: 250
HTTPWorm.exe: 500
SQLInject.exe: 750
DeepscanV1.exe: 75
DeepscanV2.exe: 400
ServerProfiler.exe: 75
AutoLink.exe: 25
*/