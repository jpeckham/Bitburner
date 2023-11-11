/** @param {NS} ns */
export async function main(ns) {
	const red = "\u001b[31m";
	const reset = "\u001b[0m";
	function printOutput(hostname, node, prefix = ["  "], last = true) {
		let children = Object.keys(node);
		const titlePrefix = prefix.slice(0, prefix.length - 1).join("") + (last ? "┗ " : "┣ ");
		const infoPrefix = prefix.join("") + (children.length > 0 ? "┃   " : "    ");
		const server = ns.getServer(hostname);
		ns.tprintf(titlePrefix + hostname + ` ${red}${!server.hasAdminRights ? "nuke" : ""}${reset} ${red}${!server.backdoorInstalled && server.requiredHackingSkill <= ns.getHackingLevel() ? "backdoor" : ""}${reset}\n`);


		if (hostname != 'home') {

			//if (server.organizationName)
			//        ns.tprintf(`${infoPrefix}organizationName: ${server.organizationName}\n`);
			//if (server.maxRam)
			//        ns.tprintf(`${infoPrefix}maxRam: ${ns.formatRam(server.maxRam)}\n`);
			//      if (server.hackDifficulty > server.minDifficulty)
			//ns.tprintf(`${infoPrefix}hackDifficulty: ${server.hackDifficulty}\n`);
			if (skill < server.requiredHackingSkill)
				ns.tprintf(`${infoPrefix}requiredHackingSkill: ${server.requiredHackingSkill}\n`);
			//if (server.moneyAvailable)
			//ns.tprintf(`${infoPrefix}moneyAvailable: ${ns.formatNumber(server.moneyAvailable)}\n`);
		}


		children.forEach((n, i) =>
			printOutput(n, node[n], [...prefix, i === children.length - 1 ? "  " : "┃ "], i === children.length - 1),
		);
	};
	let excludedServers = ns.getPurchasedServers();
	excludedServers.push("darkweb");
	let skill = ns.getHackingLevel();
	function scanAll(ns, host, servers, serverTree) {
		var hosts = ns.scan(host);

		hosts = hosts.filter((v, i, a) => !excludedServers.some(v2 => v2 == v));
		for (let i = 0; i < hosts.length; i++) {
			if (!servers.has(hosts[i])) {
				serverTree[host][hosts[i]] = {};
				servers.add(hosts[i]);
				scanAll(ns, hosts[i], servers, serverTree[host]);
			}
		}
	}
	let servers = new Set(["home"]);
	let serverTree = { "home": {} };
	scanAll(ns, "home", servers, serverTree);
	printOutput("home", serverTree["home"]);
	//ns.tprint(serverTree);

}

