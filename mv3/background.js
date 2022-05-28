chrome.runtime.onInstalled.addListener(function(details) {
	if (details.reason == "install") {
			// Set commands on install
			chrome.storage.sync.get(['commands'], function(result) {
					if (typeof result === "undefined") {
							chrome.storage.sync.set({
									"commands": [{
											id: 0,
											name: "/draw",
											label: "Make a drawing",
											description: "Add an annotation to the page.",
											image: chrome.runtime.getURL("assets/thingything.svg"),
											content: "",
											type: "script",
											visibility: "Visible"
									}, {
											id: 1,
											name: "/record",
											label: "Make a recording",
											description: "Create a video or audio recording.",
											image: chrome.runtime.getURL("assets/draw.png"),
											content: "",
											type: "script",
											visibility: "Visible"
									}]
							});
					}
			});
			chrome.storage.sync.get(['idnum'], function(result) {
					if (typeof result === "undefined") {
							chrome.storage.sync.set({
									"idnum": 2
							});
					}
			});
	} else if (details.reason == "update") {
			// Set commands on update
			chrome.storage.sync.get(['commands'], function(result) {
					if (typeof result.commands === "undefined") {
							chrome.storage.sync.set({
									"commands": [{
											id: 0,
											name: "/draw",
											label: "Make a drawing",
											description: "Add an annotation to the page.",
											image: chrome.runtime.getURL("assets/thingything.svg"),
											content: "",
											type: "script",
											visibility: "Visible"
									}, {
											id: 1,
											name: "/record",
											label: "Make a recording",
											description: "Create a video or audio recording.",
											image: chrome.runtime.getURL("assets/draw.png"),
											content: "",
											type: "script",
											visibility: "Visible"
									}]
							});
					}
			});
			chrome.storage.sync.get(['idnum'], function(result) {
					if (typeof result.idsnum === "undefined") {
							chrome.storage.sync.set({
									"idnum": 2
							});
					}
			});
	}
});