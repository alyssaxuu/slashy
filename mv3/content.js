$(document).ready(() => {
	var commands = []
	var lastelement;
	var lastcommand;
	var cursorpos;
	var saving = false;
	const commandbutton = '<div id="notion-command-button"><img src="' + chrome.runtime.getURL("assets/zap.svg") + '"></div>';
	const commandsidebar = '<div class="notion-sidebar-thing"><div class="notion-sidebar-head"><div class="notion-sidebar-title">Commands</div><div class="notion-sidebar-button">New command</div></div><div class="notion-command-sidebar-body"></div>';

	function fixReact() {
		var s = document.createElement('script');
		s.src = chrome.runtime.getURL('force.js');
		s.onload = function() {
				this.remove();
		};
		(document.head || document.documentElement).appendChild(s);
	}

	function injectContent() {
			fixReact();
			$("body").append("<div id='tooltip-thing'>Embed an Excalidraw whiteboard.</div><div class='notion-command-tooltip'>View all commands</div>")
			$.ajax({
					url: chrome.runtime.getURL("content.html"),
					success: function(data) {
							chrome.storage.sync.get(['commands'], function(result) {
									commands = result.commands;
							})
							$("body").append(data);
							$("body").append($(".notion-form-wrap"));
							$("#notion-close").attr("src", chrome.runtime.getURL("assets/close.svg"));
							$("#notion-close-2").attr("src", chrome.runtime.getURL("assets/close.svg"));
							$("#notion-close-3").attr("src", chrome.runtime.getURL("assets/close.svg"));
							$("#notion-close-4").attr("src", chrome.runtime.getURL("assets/close.svg"));
							$(".notion-form-dropdown-right img").attr("src", chrome.runtime.getURL("assets/dropdown.svg"));
							$("#notion-pencil img").attr("src", chrome.runtime.getURL("assets/pencil.svg"));
							$("#notion-line img").attr("src", chrome.runtime.getURL("assets/line.svg"));
							$("#notion-text img").attr("src", chrome.runtime.getURL("assets/text.svg"));
							$("#notion-eraser img").attr("src", chrome.runtime.getURL("assets/eraser.svg"));
							$("#notion-clear img").attr("src", chrome.runtime.getURL("assets/clear.svg"));
							waitForElm(".notion-topbar-share-menu").then(() => {
									$(".notion-topbar-share-menu").after(commandbutton);
							})
							initCanvas();
					}
			})
	}

	function toggleCommandSidebar() {
			hideCommandTooltip();
			if ($("#notion-command-button").hasClass("command-button-active")) {
					$("#notion-command-button").removeClass("command-button-active");
					if ($(".notion-update-sidebar-tab-comments-header").length) {
							$(".notion-topbar-comments-button").trigger("click");
							$(".notion-update-sidebar-tab-comments-header").parent().show();
					} else {
							$(".notion-topbar-updates-button").trigger("click");
							$(".notion-update-sidebar-tab-updates-header").parent().show();
					}
					$(".notion-topbar-comments-button").removeClass("css-override");
					$(".notion-topbar-updates-button").removeClass("css-override");
			} else {
					if ($(".notion-update-sidebar").length) {
							if ($(".notion-update-sidebar-tab-comments-header").length) {
									$(".notion-update-sidebar-tab-comments-header").parent().after(commandsidebar);
									$(".notion-update-sidebar-tab-comments-header").parent().hide();
							} else {
									$(".notion-update-sidebar-tab-updates-header").parent().after(commandsidebar);
									$(".notion-update-sidebar-tab-updates-header").parent().hide();
							}
							$(".notion-topbar-comments-button").addClass("css-override");
							$(".notion-topbar-updates-button").addClass("css-override");
							$("#notion-command-button").addClass("command-button-active");
							renderItems();
					} else {
							$(".notion-topbar-comments-button").trigger("click");
							$(".notion-topbar-comments-button").addClass("css-override");
							$(".notion-topbar-updates-button").addClass("css-override");
							$("#notion-command-button").addClass("command-button-active");
							window.setTimeout(function() {
									$(".notion-update-sidebar-tab-comments-header").parent().after(commandsidebar);
									$(".notion-update-sidebar-tab-comments-header").parent().hide();
									renderItems();
							}, 50);
					}
			}
	}

	function revertSidebar(e) {
			if ($("#notion-command-button").hasClass("command-button-active") && $(this).hasClass("notion-topbar-comments-button")) {
					e.preventDefault();
					e.stopPropagation();
			}
			$(".notion-update-sidebar-tab-comments-header").parent().show();
			$(".notion-update-sidebar-tab-updates-header").parent().show();
			$("#notion-command-button").removeClass("command-button-active");
			$(".notion-topbar-comments-button").removeClass("css-override");
			$(".notion-topbar-updates-button").removeClass("css-override");
			$(".notion-sidebar-thing").remove();
	}


	function waitForElm(selector) {
			return new Promise(resolve => {
					if (document.querySelector(selector)) {
							return resolve(document.querySelector(selector));
					}

					const observer = new MutationObserver(mutations => {
							if (document.querySelector(selector)) {
									resolve(document.querySelector(selector));
									observer.disconnect();
							}
					});

					observer.observe(document.body, {
							childList: true,
							subtree: true
					});
			});
	}

	function getSelectionStart() {
			var node = document.getSelection().anchorNode;
			return (node.nodeType == 3 ? node.parentNode : node);
	}

	function getCaretPosition(editableDiv) {
			var caretPos = 0,
					sel, range;
			if (window.getSelection) {
					sel = window.getSelection();
					if (sel.rangeCount) {
							range = sel.getRangeAt(0);
							if (range.commonAncestorContainer.parentNode == editableDiv) {
									caretPos = range.endOffset;
							}
					}
			} else if (document.selection && document.selection.createRange) {
					range = document.selection.createRange();
					if (range.parentElement() == editableDiv) {
							var tempEl = document.createElement("span");
							editableDiv.insertBefore(tempEl, editableDiv.firstChild);
							var tempRange = range.duplicate();
							tempRange.moveToElementText(tempEl);
							tempRange.setEndPoint("EndToEnd", range);
							caretPos = tempRange.text.length;
					}
			}
			return caretPos;
	}

	function escapeRegExp(string) {
			return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function reverse(s) {
			return [...s].reverse().join("");
	}

	function autocompleteMatch(input) {
			if (input == '') {
					return [];
			}
			input = input.slice(0, cursorpos);
			input = escapeRegExp(reverse(reverse(input).split(/\/(.*)/s)[0]));
			var reg = new RegExp(input)
			return commands.filter(function(term) {
					if (term.name.match(reg) && term.visibility != "Hidden") {
							return term;
					}
			});
	}

	function renderItems() {
			$(".notion-command-sidebar-body").html("");
			chrome.storage.sync.get(['commands'], function(result) {
					if (typeof result === "undefined") {
							console.log("ERROR");
					} else {
							result.commands.forEach(function(command) {
									renderCommandItem(command);
							});
					}
			});
	}

	function renderCommandItem(command) {
			const name = command.label;
			const desc = command.description;
			const img = command.image;
			const onerror = 'this.onerror = null; this.src="' + chrome.runtime.getURL("assets/fallback.png") + '"';
			if (command.id == 0 || command.id == 1) {
					$(".notion-command-sidebar-body").append("<div class='notion-command-sidebar-item' data-id='" + command.id + "'><div class='notion-command-sidebar-item-icon'><img src='" + img + "' onerror='" + onerror + "'></div><div class='notion-command-sidebar-item-info'><div class='notion-command-sidebar-item-title'>" + name + "</div><div class='notion-command-sidebar-item-desc'>" + desc + "</div></div></div>")
			} else {
					$(".notion-command-sidebar-body").append("<div class='notion-command-sidebar-item' data-id='" + command.id + "'><div class='notion-command-sidebar-item-icon'><img src='" + img + "' onerror='" + onerror + "'></div><div class='notion-command-sidebar-item-info'><div class='notion-command-sidebar-item-title'>" + name + "</div><div class='notion-command-sidebar-item-desc'>" + desc + "</div></div><div class='notion-command-sidebar-hover'><span>Edit</span><div class='notion-command-item-hover-wrap'><img src='" + chrome.runtime.getURL("assets/trash.svg") + "'></div></div></div>")
			}
	}

	function renderPlaceholder() {
			$(".notion-command-sidebar-body").html('<img src="' + chrome.runtime.getURL("assets/cooltest.svg") + '" id="command-placeholder">');
	}

	$(document).on("keyup", (e) => {
			if (e.which == 37 || e.which == 38 || e.which == 39 || e.which == 40 || e.which == 13 || e.which == 8) {
					return false;
			}
			if ($(e.target).is('input') || $(e.target).is('textarea')) {
					return false;
			}
			cursorpos = getCaretPosition(getSelectionStart());
			var check = autocompleteMatch($(getSelectionStart()).text());
			if ($(".temp-section").length) {
					$(".temp-section").remove();
			}
			if (check.length > 0) {
					lastelement = $(getSelectionStart());
					const onerror = "this.onerror = null; this.src='" + chrome.runtime.getURL("assets/fallback.png") + "'";
					check.forEach((command) => {
							$("#tooltip-thing").html(command.description);
							if ($(".temp-section").length) {
									$(".temp-section").remove();
							}
							if ($(".notion-overlay-container").find(".notion-focusable[role='button'][tabindex=0]:first").length) {
									var parent = $(".notion-overlay-container").find(".notion-focusable[role='button'][tabindex=0]:first").parent().parent();
									parent.append('<div class="temp-section"><div class="temp-section-name">PLUGINS</div><div class="temp-item" data-command="' + command.name + '" tabindex="0"><div class="temp-left-image"><img onerror="' + onerror + '" src="' + command.image + '"></div><div class="temp-right-info"><div class="temp-title">' + command.label + '</div><div class="temp-desc">' + command.description + '</div></div></div></div>')
							} else if ($(".notion-overlay-container").find(".notion-scroller").length) {
									$(".notion-overlay-container").find(".notion-scroller").parent().append('<div class="temp-section"><div class="temp-section-name">PLUGINS</div><div class="temp-item" data-command="' + command.name + '" tabindex="1"><div class="temp-left-image"><img onerror="' + onerror + '" src="' + command.image + '"></div><div class="temp-right-info"><div class="temp-title">' + command.label + '</div><div class="temp-desc">' + command.description + '</div></div></div></div>')
									$(".notion-overlay-container").find(".notion-scroller").hide();
									setCaretPosition(lastelement[0], cursorpos);
									$(".notion-overlay-container").find(".notion-focusable[role='button'][tabindex=0]").blur();
							}
					})
			}
	})

	function showTooltip() {
			var left = $(this).offset().left + $(this).width() + 7;
			var top = $(this).offset().top + ($(this).height() / 2) - 8;
			$("#tooltip-thing").css({
					left: left,
					top: top
			});
			$("#tooltip-thing").addClass("tooltip-show-me");
	}

	function showCommandTooltip() {
			if ($(this).hasClass("command-button-active")) {
					$(".notion-command-tooltip").html("Close all commands");
			} else {
					$(".notion-command-tooltip").html("View all commands");
			}
			var left = $(this).offset().left - ($(".notion-command-tooltip").width() / 2) + 10;
			var top = $(this).offset().top + 36;
			$(".notion-command-tooltip").css({
					left: left,
					top: top
			});
			$(".notion-command-tooltip").addClass("tooltip-show-me");
	}

	function hideCommandTooltip() {
			$(".notion-command-tooltip").removeClass("tooltip-show-me");
	}

	function hideTooltip() {
			$("#tooltip-thing").removeClass("tooltip-show-me");
	}

	$.fn.selectRange = function(start, end) {
			if (end === undefined) {
					end = start;
			}
			return this.each(function() {
					if ('selectionStart' in this) {
							this.selectionStart = start;
							this.selectionEnd = end;
					} else if (this.setSelectionRange) {
							this.setSelectionRange(start, end);
					} else if (this.createTextRange) {
							var range = this.createTextRange();
							range.collapse(true);
							range.moveEnd('character', end);
							range.moveStart('character', start);
							range.select();
					}
			});
	};

	function overrideKey(e) {
			if ($(".temp-item").length) {
					if (e.which == 38) {
							if ($(".temp-item").is(":focus")) {
									$(".temp-item").blur();
									$(".notion-overlay-container").find(".notion-focusable[role='button'][tabindex=0]:first").trigger("mouseover");
									$(".notion-overlay-container").find(".notion-focusable[role='button'][tabindex=0]:first").css('background', 'rgba(55, 53, 47, 0.08)');
									$(".notion-overlay-container").find(".notion-focusable[role='button'][tabindex=0]:first").css('outline', 'none!important');
									$(".notion-overlay-container").find(".notion-focusable[role='button'][tabindex=0]:first").css('box-shadow', 'none!important');
									$(".notion-overlay-container").find(".notion-focusable[role='button'][tabindex=0]:first").css('border', '0px!important');
							}
					} else if (e.which == 40) {
							if ($(".temp-section").prev().find(".notion-focusable")[0].style.background == 'rgba(55, 53, 47, 0.08)') {
									$(".temp-item").focus();
									$(".temp-section").prev().find(".notion-focusable").css('background', 'rgba(55, 53, 47, 0.00)');
							} else if ($(".temp-item").is(":focus")) {
									$(".temp-item").blur();
									$(".temp-section").prev().find(".notion-focusable").trigger("mouseover")
									$(".temp-section").prev().find(".notion-focusable").css('background', 'rgba(55, 53, 47, 0.08)');
									$(".temp-section").prev().find(".notion-focusable").css('outline', 'none!important');
									$(".temp-section").prev().find(".notion-focusable").css('box-shadow', 'none!important');
									$(".temp-section").prev().find(".notion-focusable").css('border', '0px!important');
							}
					} else if (e.which == 13) {
							if ($(".temp-item").is(":focus")) {
									e.preventDefault();
									e.stopPropagation();
									performAction($(".temp-item").attr("data-command"));
							}
					} else {
							if ($(".temp-section").length) {
									$(".temp-section").remove();
							}
							$(".notion-overlay-container").find(".notion-scroller").show();
					}
			}
	}

	function createModal(title, label, fun) {
			document.body.innerHTML += '<div class="notion-popup" id="notion-plugin-popup"><div class="notion-head"><div class="notion-title">' + title + '</div><img src="' + chrome.runtime.getURL("assets/close.svg") + '" id="notion-close-3"></div><div id="notion-plugin-popup-label">' + label + '</div><input class="notion-form-input" id="notion-plugin-popup-input" placeholder="Something here"><div id="notion-plugin-popup-submit">Submit</div></div>';
			document.getElementById("notion-plugin-popup-submit").onclick = function() {
					fun(document.getElementById("notion-plugin-popup-input").value);
					document.getElementById("notion-plugin-popup").remove();
			}
	}

	function setCaretPosition(el, pos) {
			for (var node of el.childNodes) {
					if (node.nodeType == 3) {
							if (node.length >= pos) {
									var range = document.createRange(),
											sel = window.getSelection();
									range.setStart(node, pos);
									range.collapse(true);
									sel.removeAllRanges();
									sel.addRange(range);
									return -1;
							} else {
									pos -= node.length;
							}
					} else {
							pos = setCaretPosition(node, pos);
							if (pos == -1) {
									return -1;
							}
					}
			}
			return pos;
	}

	function clearSelection() {
			if (window.getSelection) {
					window.getSelection().removeAllRanges();
			} else if (document.selection) {
					document.selection.empty();
			}
	}

	function performAction(command) {
			lastcommand = command;
			var inst = commands.find(x => x.name == command);
			window.setTimeout(function() {
					setCaretPosition(lastelement[0], cursorpos);
					lastelement.html(lastelement.text().replace(command, ""));
					lastelement.html(lastelement.text().replace(/(\/\S+)/gi, ""));
					if (command == "/draw") {
							showCanvas();
					} else if (command == "/record") {
							showRecording();
					} else {
							if (inst.type == "Template") {
									navigator.clipboard.writeText(inst.content).then(function() {
											document.execCommand('paste');
											clearSelection()
									})
							} else if (inst.type == "Image") {
									var img = new Image();
									img.crossOrigin = "anonymous"
									const canvas2 = document.createElement("canvas");
									img.onload = function() {
											canvas2.width = img.width;
											canvas2.height = img.height;
											canvas2.getContext("2d").drawImage(img, 0, 0, img.width, img.height);
											canvas2.toBlob((blob) => {
													navigator.clipboard.write([
															new ClipboardItem({
																	"image/png": blob
															})
													]).then(function() {
															document.execCommand('paste');
													})
											}, "image/png");
									}
									img.src = inst.content;
							} else if (inst.type == "Script") {
									var interpreter = new Sval({
											sandbox: false
									});
									interpreter.import({
											writeToNotion: function(n) {
													setCaretPosition(lastelement[0], cursorpos)
													lastelement.html(lastelement.text().replace(lastcommand, ""))
													lastelement.html(lastelement.text().replace(/(\/\S+)/gi, ""))
													setTimeout(function() {
															navigator.clipboard.writeText(n).then(function() {
																	document.execCommand('paste');
																	clearSelection()
															})
													}, 100)
											},
											addImageBlob: n => navigator.clipboard.write([new ClipboardItem({
													'image/png': n
											})]).then(function() {
													document.execCommand('paste');
											}),
											showModal: function(label, placeholder, fun) {
													document.getElementById("notion-plugin-popup").classList.add("notion-plugin-show");
													document.getElementById("notion-plugin-popup-title").innerHTML = inst.label;
													document.getElementById("notion-plugin-popup-input").placeholder = placeholder;
													document.getElementById("notion-plugin-popup-label").innerHTML = label;
													document.getElementById("notion-plugin-popup-submit").onclick = function() {
															fun(document.getElementById("notion-plugin-popup-input").value);
															document.getElementById("notion-plugin-popup").classList.remove("notion-plugin-show");
													}
											}
									})
									interpreter.run(inst.content);
							}
					}
			}, 100)
	}

	function forceInput(e) {
			e.stopPropagation();
	}

	function forceInputPaste(e) {
			e.stopPropagation();
	}

	function showDropdown(e) {
			$(".show-dropdown").removeClass("show-dropdown");
			e.stopPropagation();
			e.preventDefault();
			$(this).parent().find(".notion-form-dropdown-options").addClass("show-dropdown");
	}

	function toggleDropdownOption(e) {
			$(".show-dropdown").removeClass("show-dropdown");
			e.stopPropagation();
			e.preventDefault();
			var option = $(this).attr("data-id");
			if (option == "Visible" || option == "Hidden" || option == "Template" || option == "Script" || option == "Image") {
					$(this).parent().parent().find(".notion-form-dropdown-wrap span").html(option);
					$(this).parent().parent().find(".notion-form-dropdown-wrap").attr("data-id", option);
			}
			if (option == "Script") {
					$("#notion-action-label").html("JavaScript");
					$(".notion-form-textarea").attr("placeholder", "Add the Js code to run in the Notion page");
			} else if (option == "Template") {
					$("#notion-action-label").html("Template content");
					$(".notion-form-textarea").attr("placeholder", "Write some content to insert into the Notion page");
			} else if (option == "Image") {
					$("#notion-action-label").html("Image link");
					$(".notion-form-textarea").attr("placeholder", "Add the image link to insert into the Notion page");
			}
	}

	function sanitize(string) {
			const map = {
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&#x27;',
					"/": '&#x2F;',
			};
			const reg = /[&<>"'/]/ig;
			return string.replace(reg, (match) => (map[match]));
	}

	function checkForm() {
			var update = false;
			var id = 0;
			if ($(".notion-form-save").attr("data-edit") == "true") {
					update = true;
					id = $(".notion-form-save").attr("data-id");
			}
			const name = $("input[name='notion-form-command-name']").val();
			const description = $("input[name='notion-form-command-description']").val();
			const command = $("input[name='notion-form-command'").val();
			const content = $(".notion-form-textarea").val();
			const type = $("#notion-form-type").attr("data-id");
			const image = $("#notion-image-field").val();
			const visibility = $("#notion-form-visibility").attr("data-id");
			var flagcheck = false;
			$(".notion-form-error").removeClass("notion-form-error");
			if (name == "") {
					$("input[name='notion-form-command-name']").addClass("notion-form-error");
					flagcheck = true;
			}
			if (description == "") {
					$("input[name='notion-form-command-description']").addClass("notion-form-error");
					flagcheck = true;
			}
			if (command == "/" || command == "") {
					$("input[name='notion-form-command']").addClass("notion-form-error");
					flagcheck = true;
			}
			if (content == "") {
					$(".notion-form-textarea").addClass("notion-form-error");
					flagcheck = true;
			}
			if (type != "Template" && type != "Script" && type != "Image") {
					flagcheck = true;
			}
			if (visibility != "Visible" && visibility != "Hidden") {
					flagcheck = true;
			}
			if (!flagcheck) {
					if (update) {
							updateForm(name, description, command, content, type, visibility, id, image);
					} else {
							saveForm(name, description, command, content, type, visibility, image);
					}
			}
	}

	function saveForm(name, description, command, content, type, visibility, image) {
			chrome.storage.sync.get(['idnum'], function(num) {
					if (typeof num === "undefined") {
							console.log("ERROR");
					} else {
							chrome.storage.sync.get(['commands'], function(result) {
									if (typeof result === "undefined") {
											console.log("ERROR");
									} else {
											commands = result.commands.concat({
													id: num.idnum,
													name: command,
													label: name,
													description: description,
													image: image,
													content: content,
													type: type,
													visibility: visibility
											});
											chrome.storage.sync.set({
													"idnum": num.idnum + 1
											});
											chrome.storage.sync.set({
													"commands": commands
											});
											renderItems();
											hideForm();
									}
							});
					}
			});
	}

	function updateForm(name, description, command, content, type, visibility, id, image) {
			var cmd = commands.find(x => x.id == id);
			cmd.label = name;
			cmd.description = description;
			cmd.name = command;
			cmd.content = content;
			cmd.type = type;
			cmd.visibility = visibility;
			cmd.image = image;
			chrome.storage.sync.set({
					"commands": commands
			}).then(function() {
					renderItems();
					hideForm();
			});
	}

	function showForm() {
			$(".notion-form-wrap").addClass("notion-show-form");
			$(".notion-form-wrap input").val("");
			$(".notion-form-wrap textarea").val("");
			$("#notion-command-field").val("/");
			$(".notion-form-save").attr("data-edit", "false");
			$("#notion-form-type").attr("data-id", "Template");
			$("#notion-form-type span").html("Template");
			$("#notion-action-label").html("Template content");
			$(".notion-form-error").removeClass("notion-form-error");
			$(".notion-form-body").scrollTop(0);
	}

	function editCommand() {
			var id = $(this).parent().parent().attr("data-id");
			chrome.storage.sync.get(['commands'], function(result) {
					var command = result.commands.find(x => x.id == id);
					$(".notion-form-wrap").addClass("notion-show-form");
					$(".notion-form-error").removeClass("notion-form-error");
					$(".notion-form-wrap input").val("");
					$(".notion-form-wrap textarea").val("");
					$("#notion-image-field").val(command.image);
					$("#notion-name-field").val(command.label);
					$("#notion-description-field").val(command.description);
					$("#notion-command-field").val(command.name);
					$(".notion-form-textarea").val(command.content);
					$("#notion-form-type").attr("data-id", command.type);
					$("#notion-form-type span").html(command.type);
					$("#notion-form-visibility span").html(command.visibility);
					if (command.type == "Template") {
							$("#notion-action-label").html("Template content");
					} else if (command.type == "Script") {
							$("#notion-action-label").html("Javascript");
					} else if (command.type == "Image") {
							$("#notion-action-label").html("Image link");
					}
					$(".notion-form-save").attr("data-id", id);
					$(".notion-form-save").attr("data-edit", "true");
			});
	}

	function hideForm() {
			$(".notion-form-wrap").removeClass("notion-show-form");
	}

	function showCanvas() {
			$("#notion-draw-popup").addClass("notion-draw-show");
			canvas.backgroundColor = "#FFF";
			canvas.renderAll();
	}

	function showRecording() {
			$("#record-button").removeClass("record-stop");
			$("#notion-record-popup").addClass("notion-draw-show");
			requestCamera();
	}

	function confirmDeleteCommand() {
			$(".notion-confirm-wrap .notion-confirm-delete").attr("data-id", $(this).parent().parent().attr("data-id"));
			$(".notion-confirm-wrap").addClass("notion-confirm-show");
	}

	function hideConfirmDelete() {
			$(".notion-confirm-wrap").removeClass("notion-confirm-show");
	}

	function deleteCommand() {
			$(".notion-confirm-wrap").removeClass("notion-confirm-show");
			var id = $(this).attr("data-id");
			$(".notion-command-sidebar-item[data-id='" + id + "']").remove();
			chrome.storage.sync.get(['commands'], function(result) {
					if (typeof result === "undefined") {
							console.log("ERROR");
					} else {
							result.commands.forEach(function(command) {
									if (command.image == "") {
											command.image = chrome.runtime.getURL("assets/tempthing.png")
									}
							});
							commands = result.commands;
							commands = commands.filter(function(el) {
									return el.id != id
							});
							chrome.storage.sync.set({
									"commands": commands
							});
					}
			});
	}

	/* Drawing canvas */

	var line, isDown, mode, canvas;
	var color = "#634ff1";

	function initCanvas() {
			canvas = new fabric.Canvas(document.getElementById('fabric-canvas'), {
					width: 500,
					height: 310,
					backgroundColor: "#FFF"
			});
			canvas.selection = false;
			canvas.renderAll();
			canvas.isDrawingMode = true;
			canvas.freeDrawingBrush.width = 5;
			canvas.freeDrawingBrush.color = color;
			canvas.on('path:created', function(e) {
					e.path.set();
					canvas.renderAll();
			});

			canvas.on('mouse:down', function(o) {
					isDown = true;
					var pointer = canvas.getPointer(o.e);
					var points = [pointer.x, pointer.y, pointer.x, pointer.y];

					if (mode == "draw") {
							line = new fabric.Line(points, {
									strokeWidth: 5,
									fill: color,
									stroke: color,
									originX: 'center',
									originY: 'center',
									selectable: false,
									hasBorders: false
							});
							canvas.add(line);
					} else if (mode == "text") {
							var text = new fabric.IText('', {
									left: o.e.offsetX,
									top: o.e.offsetY,
									fontFamily: "Helvetica",
									hasBorders: false
							});
							canvas.add(text).setActiveObject(text);
							text.enterEditing();
					}
			});

			canvas.on('mouse:move', function(o) {
					if (!isDown) return;
					var pointer = canvas.getPointer(o.e);

					if (mode == "draw") {
							line.set({
									x2: pointer.x,
									y2: pointer.y
							});
							canvas.renderAll();
					}
			});

			canvas.on('mouse:up', function(o) {
					if (mode == "draw" && typeof line !== 'undefined') {
							isDown = false;
							line.setCoords();
					}
			});
	}

	function switchTool() {
			if ($(this).attr("id") != "notion-clear") {
					$(".notion-tool-active").removeClass("notion-tool-active");
					$(this).addClass("notion-tool-active")
			}
			if ($(this).attr("id") == "notion-pencil") {
					canvas.isDrawingMode = true;
					canvas.freeDrawingBrush.width = 5;
					canvas.freeDrawingBrush.color = color;
					mode = "free"
			} else if ($(this).attr("id") == "notion-line") {
					canvas.isDrawingMode = false;
					mode = "draw"
			} else if ($(this).attr("id") == "notion-text") {
					canvas.isDrawingMode = false;
					mode = "text"
			} else if ($(this).attr("id") == "notion-eraser") {
					canvas.isDrawingMode = true;
					mode = "eraser"
					canvas.freeDrawingBrush.width = 20;
					canvas.freeDrawingBrush.color = '#FFF';
			} else if ($(this).attr("id") == "notion-clear") {
					canvas.clear();
					canvas.renderAll();
			}
			canvas.selection = false;
			canvas.renderAll();
	}


	function closePluginNotion() {
			$("#notion-plugin-popup").removeClass("notion-plugin-show");
	}

	function closeDrawNotion() {
			$("#notion-draw-popup").removeClass("notion-draw-show");
			canvas.clear();
			canvas.renderAll();
	}

	function closeRecordNotion() {
			$("#notion-record-popup").removeClass("notion-draw-show");
			stopRecording();
	}

	function showColors() {
			$(".notion-color-box").toggleClass("notion-color-box-show");
	}

	function switchColor() {
			color = $(this).attr("data-color");
			canvas.freeDrawingBrush.color = color;
			$(".notion-color-in").css("background", color);
			canvas.renderAll();
			$(".notion-color-box").removeClass("notion-color-box-show");
	}

	function dataURItoBlob(dataURI) {
			var byteString = atob(dataURI.split(',')[1]);
			var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]
			var ab = new ArrayBuffer(byteString.length);
			var ia = new Uint8Array(ab);
			for (var i = 0; i < byteString.length; i++) {
					ia[i] = byteString.charCodeAt(i);
			}
			var blob = new Blob([ab], {
					type: mimeString
			});
			return blob;
	}

	function saveImage() {
			window.setTimeout(function() {
					setCaretPosition(lastelement[0], cursorpos);
					navigator.clipboard.write([new ClipboardItem({
							'image/png': dataURItoBlob(canvas.toDataURL('png'))
					})]).then(function() {
							document.execCommand('paste');
							clearSelection();
							closeDrawNotion();
					})
			}, 100);
	}

	/* Record video */
	let camera_stream = null;
	let media_recorder = null;
	let blobs_recorded = [];

	function requestCamera() {
			navigator.mediaDevices.getUserMedia({
					video: true,
					audio: true
			}).then(function(stream) {
					camera_stream = stream;
					document.getElementById("notion-video").srcObject = camera_stream;
					document.getElementById("notion-video").muted = true;
					document.getElementById("notion-video").play()
			});
	};

	function download(dataurl, filename) {
			const link = document.createElement("a");
			link.href = dataurl;
			link.download = filename;
			link.click();
	}

	function startRecording() {
			if ($(this).hasClass("record-stop")) {
					saving = true;
					stopRecording();
			} else {
					navigator.mediaDevices.getUserMedia({
							video: true,
							audio: true
					}).then(function(stream) {
							camera_stream = stream;
							document.getElementById("notion-video").srcObject = camera_stream;
							document.getElementById("notion-video").muted = true;
							document.getElementById("notion-video").play()
							media_recorder = new MediaRecorder(camera_stream, {
									mimeType: 'video/webm'
							});
							media_recorder.addEventListener('dataavailable', function(e) {
									blobs_recorded.push(e.data);
							});
							media_recorder.addEventListener('stop', function() {
									if (saving) {
											saving = false;
											let video_local = URL.createObjectURL(new Blob(blobs_recorded, {
													type: 'video/webm'
											}));
											download(video_local, "notion-video.webm")
									}
									stream.getTracks().forEach(function(track) {
											track.stop();
									});
							});
							media_recorder.start(1000);
							$("#record-button").addClass("record-stop");
					});
			}
	}

	function stopRecording() {
			camera_stream.getTracks().forEach(function(track) {
					track.stop();
			});
			media_recorder.stop();
			closeRecordNotion();
	}

	function globalClick() {
			if (!$(this).hasClass("notion-dropdown-options") && !$(this).hasClass("notion-dropdown-option") && !$(this).hasClass("notion-dropdown-wrap")) {
					$(".show-dropdown").removeClass("show-dropdown");
			}
	}

	function closeActivate() {
			$("#notion-activate-popup").remove();
	}

	$(document).on("click", globalClick);
	$(document).on("click", ".notion-tool", switchTool);
	$(document).on("click", ".notion-color-item", switchColor);
	$(document).on("click", ".notion-color-out", showColors);
	$(document).on("click", ".notion-save", saveImage);
	$(document).on("click", "#notion-close", closeDrawNotion);
	$(document).on("click", "#notion-close-2", closeRecordNotion);
	$(document).on("click", "#notion-close-4", closePluginNotion)
	$(document).on("keydown", overrideKey);
	$(document).on("mouseover", ".temp-item", showTooltip);
	$(document).on("mouseout", ".temp-item", hideTooltip);
	$(document).on("click", ".temp-item", function() {
			performAction($(".temp-item").attr("data-command"));
	})
	$(document).on("click", "#record-button", startRecording);
	$(document).on("click", "#notion-command-button", toggleCommandSidebar);
	$(document).on("mousedown", ".notion-topbar-comments-button", revertSidebar);
	$(document).on("click", ".notion-topbar-updates-button", revertSidebar);
	$(document).on("click", ".notion-fadein", revertSidebar);
	$(document).on("mouseover", "#notion-command-button", showCommandTooltip);
	$(document).on("mouseout", "#notion-command-button", hideCommandTooltip);
	$(document).on("click", ".notion-sidebar-button", showForm);
	$(document).on("click", ".notion-form-back", hideForm);
	$(document).on("click", ".notion-form-cancel", hideForm);
	$(document).on("click", ".notion-form-save", checkForm);
	$(document).on("click", "#notion-close-3", hideForm);
	$(document).on("keydown", ".notion-form-input", forceInput);
	$(document).on("keydown", ".notion-form-textarea", forceInput);
	$(document).on("paste", ".notion-form-input", forceInputPaste);
	$(document).on("paste", ".notion-form-textarea", forceInputPaste)
	$(document).on("click", ".notion-command-item-hover-wrap", confirmDeleteCommand);
	$(document).on("click", ".notion-confirm-back", hideConfirmDelete);
	$(document).on("click", ".notion-confirm-cancel", hideConfirmDelete);
	$(document).on("click", ".notion-confirm-delete", deleteCommand);
	$(document).on("click", ".notion-form-dropdown-wrap", showDropdown);
	$(document).on("click", ".notion-form-dropdown-option", toggleDropdownOption);
	$(document).on("click", ".notion-command-sidebar-hover span", editCommand);
	$(document).on("click", "#notion-close-activate", closeActivate);
	$(document).on('keyup', '#notion-command-field', function() {
			var sanitized = $(this).val().replace(/\//g, '');
			$(this).val('/' + sanitized);
	});
	injectContent();
});