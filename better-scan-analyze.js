/** @param {NS} ns */
export async function main(ns) {
	function printOutput(hostname, node, prefix = ["  "], last = true) {
		let children = Object.keys(node);
		const titlePrefix = prefix.slice(0, prefix.length - 1).join("") + (last ? "┗ " : "┣ ");
		const infoPrefix = prefix.join("") + (children.length > 0 ? "┃   " : "    ");
		ns.tprintf(titlePrefix + hostname + "\n");

		const server = ns.getServer(hostname);
		if (server.organizationName)
			ns.tprintf(`${infoPrefix}organizationName: ${server.organizationName}` + "\n");
		if (server.maxRam)
			ns.tprintf(`${infoPrefix}maxRam: ${server.maxRam}` + "\n");
		if (!server.backdoorInstalled)
			ns.tprintf(`${infoPrefix}backdoorInstalled: ${server.backdoorInstalled}` + "\n");
		if (!server.hasAdminRights)
			ns.tprintf(`${infoPrefix}hasAdminRights: ${server.hasAdminRights}` + "\n");
		if (server.hackDifficulty > server.minDifficulty)
			ns.tprintf(`${infoPrefix}hackDifficulty: ${server.hackDifficulty}` + "\n");
		if (skill < server.requiredHackingSkill)
			ns.tprintf(`${infoPrefix}requiredHackingSkill: ${server.requiredHackingSkill}` + "\n");
		if (server.moneyAvailable)
			ns.tprintf(`${infoPrefix}moneyAvailable: ${server.moneyAvailable}` + "\n");


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

