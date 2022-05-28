browser.runtime.onInstalled.addListener(function(details) {
	if (details.reason == "install") {
			// Set commands on install
			var gettingItem = browser.storage.sync.get('commands');
			gettingItem.then((res) => {
					if (typeof res.commands === "undefined") {
							browser.storage.sync.set({
									"commands": [{
											id: 0,
											name: "/draw",
											label: "Make a drawing",
											description: "Add an annotation to the page.",
											image: browser.runtime.getURL("assets/thingything.svg"),
											content: "",
											type: "script",
											visibility: "Visible"
									}, {
											id: 1,
											name: "/record",
											label: "Make a recording",
											description: "Create a video or audio recording.",
											image: browser.runtime.getURL("assets/draw.png"),
											content: "",
											type: "script",
											visibility: "Visible"
									}]
							});
					}
			});

			var gettingItem = browser.storage.sync.get('idnum');
			gettingItem.then((res) => {
					if (typeof res.idnum === "undefined") {
							browser.storage.sync.set({
									"idnum": 2
							});
					}
			});
	} else if (details.reason == "update") {
			// Set commands on update
			var gettingItem = browser.storage.sync.get('commands');
			gettingItem.then((res) => {
					if (typeof res.commands === "undefined") {
							browser.storage.sync.set({
									"commands": [{
											id: 0,
											name: "/draw",
											label: "Make a drawing",
											description: "Add an annotation to the page.",
											image: browser.runtime.getURL("assets/thingything.svg"),
											content: "",
											type: "script",
											visibility: "Visible"
									}, {
											id: 1,
											name: "/record",
											label: "Make a recording",
											description: "Create a video or audio recording.",
											image: browser.runtime.getURL("assets/draw.png"),
											content: "",
											type: "script",
											visibility: "Visible"
									}]
							});
					}
			});

			var gettingItem = browser.storage.sync.get('idnum');
			gettingItem.then((res) => {
					if (typeof res.idnum === "undefined") {
							browser.storage.sync.set({
									"idnum": 2
							});
					}
			});
	}
});