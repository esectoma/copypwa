const installProgressEl = document.getElementById('installProgress')
const appCompanyEl = document.getElementById('appCompany')
const iconLoadingEl = document.getElementById('iconLoading')
const headerIconEl = document.getElementById('headerIcon')
const apkButtonEl = document.getElementById('countdown')
const installButton = document.getElementById("installButton")
const toChromeButton = document.getElementById('toChromeButton')
const toW2AButton = document.getElementById('toW2AButton')
const paLoadingEl = document.getElementById('paLoading')

function App() {
	this.isLoading = true
	this.uuid = function() {
		var s = [];
		var hexDigits = "0123456789abcdef";
		for (var i = 0; i < 32; i++) {
		s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
		}
		s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
		s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
		s[8] = s[13] = s[18] = s[23];
		var uuid = s.join("");
		return uuid;
	}
	this.getUrlParam = function (key) {//获取地址栏参数，key:参数名称
		var params = new URLSearchParams(window.location.search);
		return params.get(key);
	}
	this.isServiceWorkerSupported = function() {//是否支持pwa
	    return "serviceWorker" in navigator;
	}
	this.registerServiceWorker = function() {
		if (this.isServiceWorkerSupported()) {
			navigator.serviceWorker.register("sw.js")
				.then(function(reg) {
					console.log("Successfully registered service worker", reg);
				})
				.catch(function(err) {
					console.warn("Error whilst registering service worker", err);
				});
		}
	}
	this.isInStandaloneMode = function() {
		return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document
			.referrer.includes('android-app://')
	}
	this.setInstalled = function() {
		var t = `${appId}_pwa_install_flag`;
		localStorage.setItem(t, true)
	}
	this.setUnInstalled = function() {
		var t = `${appId}_pwa_install_flag`;
		localStorage.setItem(t, false)
	}
	this.isInstalled = function() {
		var t = `${appId}_pwa_install_flag`;
		var v = localStorage.getItem(t);
		return v && v != 'false' ? v : false
	}
	this.setUuid = function(v) {
		if (!v || v == undefined || v == 'undefined') {
			return
		}
		var t = `${appId}_pwa_uuid`;
		localStorage.setItem(t, v)
	}
	this.getUuid = function() {
		var t = `${appId}_pwa_uuid`;
		var uid = localStorage.getItem(t)
		if(uid==null||uid==""){
			uid = this.getUrlParam('pwaUuid')
			if(uid==null||uid==""){
				uid = this.uuid()
			}
			this.setUuid(uid)
		}
		return uid
	}
	this.changeToOpen = function() {
		document.getElementById("rapidDiv").style.display = "none";
		document.getElementById("openDiv").style.display = "block";
	}
	this.changeToInstall = function() {
		document.getElementById("rapidDiv").style.display = "block";
		document.getElementById("openDiv").style.display = "none";
	}
	this.showInstallAni = function() {
		installButton.setAttribute("disabled", true);
		installButton.style.opacity = 0.4
		installProgressEl.style.display = "block";
		appCompanyEl.style.display = "none"
		iconLoadingEl.classList.add('header-icon-loading-show')
		headerIconEl.style.padding = '18px'
		var d = 0
		var interval = setInterval((() => {
			d += 1
			var e = 10 - Math.floor(10 * d * .01)
			e = e <= 0 ? 0 : e
			if (d >= 100) {
				clearInterval(interval)
				installButton.removeAttribute("disabled");
				installButton.style.opacity = 1
				iconLoadingEl.classList.remove('header-icon-loading-show')
				headerIconEl.style.padding = '0'
				this.changeToOpen()
			} else {
				apkButtonEl.innerHTML = `${e}`
			}
			installProgressEl.innerHTML = `${d}%`
		}), 120)
	}
	this.addUrlTime = function() {
		var t = "fl_"
		var d = Date.now()
		var u = new URL(location.href);
		u.searchParams.set(t + "time", String(d));
		window.history.pushState("", "", u);
	}
	this.isChrome = function() {
		if (platform.name.indexOf("Chrome") >= 0) {
			return true;
		}
		return false;
	}
	this.getUrlParams = function() {
		var str = location.href; //取得整个地址栏
		var num = str.indexOf("?")
		var params = "";
		if (num > 0 && num < str.length - 2) {
			params = str.substr(num + 1);
		}
		return params
	}
	this.toChrome = function() {
		var ul = new URL(location.href);
		let uid = this.getUrlParam('pwaUuid')
		if(uid==null||uid==""){
			ul.searchParams.set("pwaUuid", this.getUuid());
			window.history.pushState("", "", ul);
		}
		ul.searchParams.set("browser_flag", 'external');//设置打开了外部浏览器
		var ulS = ul.toString()
		var href = `intent://${ulS.replace(/(https|http):\/\//, "")}`
		
		var u = href + `#Intent;scheme=https;action=android.intent.action.VIEW;component=com.android.chrome;package=com.android.chrome;end`
		//var u = href + `#Intent;scheme=https;action=android.intent.action.VIEW;component=com.android.browser;package=com.android.browser;end`
		toChromeButton.href = u
		toChromeButton.click()
	}
	this.recordPwaInstallUser = function(name,ul) {
		var u = pwaPath.endsWith("/") ? (pwaPath + 'pwaInstallUser') : (pwaPath + '/pwaInstallUser')
		var h = !ul?location.href:location.href+'####'+ul
		this.request(u, {
			name: name,
			uuid: this.getUuid(),
			href:h,
			userAgent: navigator.userAgent
		}).then(res => {
			if (res.code != 200) {
				console.log(res)
			}
		}).catch(err => {})
	}
	this.requestNotificationPermission = function requestNotificationPermission() {
		if (!window.Notification) {
			return Promise.reject('The system does not support desktop notifications')
		}
		return Notification.requestPermission().then(function(permission) {
			if (permission === 'granted') {
				return Promise.resolve()
			}
			return Promise.reject('User has disabled notification permissions')
		})
	}
	this.subscribeAndDistribute = function subscribeAndDistribute() { // 订阅推送并将订阅结果发送给后端
		if (!window.PushManager) {
			return Promise.reject('The system does not support message push')
		}
		if(!VAPIDPublicKey||VAPIDPublicKey=='null'){
			return Promise.reject('no key!')
		}
		// 检查是否已经订阅过
		return navigator.serviceWorker.ready.then((registration) => {
			return registration.pushManager
				.getSubscription()
				.then(subscription => {
					// 如果已经订阅过，就不重新订阅了
					if (subscription) {
						this.distributePushResource(subscription)
					} else {
						return (
							// 订阅
							registration.pushManager
							.subscribe({
								userVisibleOnly: true,
								applicationServerKey: base64ToUint8Array(VAPIDPublicKey),
							})
							.then(subscription2 => {
								this.distributePushResource(subscription2)
							})
						)
					}
				})
		})
	}
	this.distributePushResource = function distributePushResource(subscription) { // 将订阅信息传给后端服务器
		// 为了方便之后的推送，为每个客户端简单生成一个标识
		const body = {
			subscription,
			subscriptionText:JSON.stringify(subscription),
			uuid: this.getUuid(),
			lang:  window.navigator.language,
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			timezoneOffset: new Date().getTimezoneOffset() / 60,
		}
		//console.log('subscription=', JSON.stringify(subscription))
		var u = pwaPath.endsWith("/") ? (pwaPath + 'subscription') : (pwaPath + '/subscription')
		this.request(u, body).catch(err => {
			console.log(err)
		})
	}
	this.request = function(url, data) {
		return new Promise(function(resolve, reject) {
			var xhr = new XMLHttpRequest()
			xhr.timeout = 10000
			xhr.onreadystatechange = function() {
				var response = {}
				if (xhr.readyState === 4 && xhr.status === 200) {
					try {
						response = JSON.parse(xhr.responseText)
					} catch (e) {
						response = xhr.responseText
					}
					resolve(response)
				} else if (xhr.readyState === 4) {
					resolve()
				}
			}
			xhr.onabort = reject
			xhr.onerror = reject
			xhr.ontimeout = reject
			xhr.open('POST', url, true)
			xhr.setRequestHeader('Content-Type', 'application/json')
			xhr.send(JSON.stringify(data))
		})
	}
}

function base64ToUint8Array(base64String) {
	let padding = '='.repeat((4 - base64String.length % 4) % 4)
	let base64 = (base64String + padding)
		.replace(/\-/g, '+')
		.replace(/_/g, '/')
	let rawData = atob(base64)
	let outputArray = new Uint8Array(rawData.length)

	for (let i = 0; i < rawData.length; i++) {
		outputArray[i] = rawData.charCodeAt(i)
	}
	return outputArray
}

var app = new App();
var startD = new Date();
var documentVisibleTime = new Date();
var documentHiddenTime = null;
var isStartToChrome = false;
var startToChromeTime = null;
var startChromeNum =0 ;
(function() {
	//开始等待 记录访问日志
	app.isLoading = true;
	app.getUuid()
	app.recordPwaInstallUser("accessInstall")
	var isGetBeforeinstallprompt =false
	paLoadingEl.classList.add('pa-loading-show')
	var intervalLoading = setInterval((() => {
		var endD = new Date()
		var d = Math.abs(endD.getTime()-startD.getTime())
		if(d>=5000||isGetBeforeinstallprompt||(d>=2000&&app.isInstalled())){
			clearInterval(intervalLoading)
			paLoadingEl.classList.remove('pa-loading-show');
			app.isLoading = false;
		}
	}), 1000)
	let appPromptEvent = null;
	app.addUrlTime()
	if (app.isInstalled()) {//安装按钮文字变为 "open" 打开
		app.changeToOpen()
	}
	
	if(app.getUrlParam('browser_flag')!='external'){//没有打开google浏览器
		window.addEventListener('beforeinstallprompt', function(event) { //不触发安装事件
			event.preventDefault();
			app.setUnInstalled()
			return false;
		});
		//跳转到chrome浏览器
		app.toChrome()
	}else{
		app.registerServiceWorker()
		window.addEventListener('beforeinstallprompt', function(event) {
			event.preventDefault();
			isGetBeforeinstallprompt = true
			appPromptEvent = event;
			app.setUnInstalled()
			app.changeToInstall()
			app.recordPwaInstallUser("beforeInstallPrompt")
			return false;
		});
	}
	
	//点击事件
	var isHandling = false;
	installButton.addEventListener('click', function() {
		if (app.isLoading) {
			return
		}
		app.recordPwaInstallUser("clickInstallButton")
		if(app.getUrlParam('browser_flag')!='external'){//没有打开google浏览器
		    if(startChromeNum<1){
				startChromeNum++
				//等待3秒的动画
				app.isLoading = true;
				paLoadingEl.classList.add('pa-loading-show')
				var intervalWait = setInterval((() => {
					var endD = new Date()
					var d = Math.abs(endD.getTime()-startD.getTime())
					if(d>=3000){
						clearInterval(intervalWait)
						paLoadingEl.classList.remove('pa-loading-show');
						app.isLoading = false;
					}
				}), 500)
				//跳转到chrome
				app.toChrome()
			}else{// 跳转到w2a或下载apk
				var ul = new URL(`${apkUrl}`);
				let uid = app.getUuid()
				ul.searchParams.set("pwaUuid", uid);
				ul.searchParams.set("pwaPackageName", `${pwaPackageName}`);
				var ulS = ul.toString()
				app.recordPwaInstallUser("jumpW2a",ulS)
				toW2AButton.href = ulS
				toW2AButton.click()
			}
		}else{//已打开chrome
			if(!isHandling){
				isHandling = true;
				paLoadingEl.classList.add('pa-loading-show')
				var intervalInstall = setInterval((() => {
					var endD = new Date()
					var d = Math.abs(endD.getTime()-startD.getTime())
					
					if (appPromptEvent !== null) {//没一秒检查一次是否得到了PWA安装事件
						isHandling = false;
						paLoadingEl.classList.remove('pa-loading-show');
						clearInterval(intervalInstall);
						appPromptEvent.prompt();
						appPromptEvent.userChoice.then(function(result) {
							if (result.outcome === 'accepted') {
								app.recordPwaInstallUser("userAccept")
								app.setInstalled()
								app.showInstallAni()
								if (typeof(fbq) == "function") {
									console.log('fb track CompleteRegistration')
									fbq('track', 'CompleteInstalled')
								}
								//app.recordPwaInstallUser("appInstalled")
							} else {
								app.recordPwaInstallUser("userCancel")
							}
							appPromptEvent = null;
						});
					}else{
						var isInStandaloneMode = app.isInStandaloneMode()
						var urlParams = app.getUrlParams();
						if (isInStandaloneMode) {//pwa打开模式
							if(app.isInstalled()){
								window.location.href = `${pwaPage}?` + urlParams
							}
						} else {
							if(app.isInstalled()){
								isHandling = false;
								paLoadingEl.classList.remove('pa-loading-show');
								clearInterval(intervalInstall);
								window.open(`${pwaPage}?` + urlParams)
								return
							}
							// if(d>=11000){
							// 	isHandling = false;
							// 	paLoadingEl.classList.remove('pa-loading-show');
							// 	clearInterval(intervalInstall);
							// 	window.open(`${pwaPage}?` + urlParams)
							// }
						}
					}
					if(d>=12000){
						isHandling = false;
						paLoadingEl.classList.remove('pa-loading-show');
						clearInterval(intervalInstall);
					}
				}), 500);
			}
		}
	});
	//华为等手机不支持此方法
	// window.addEventListener('appinstalled', function() {
		
	// });
	document.addEventListener('visibilitychange', function() {
	  if (document.visibilityState === 'visible') {
	    documentVisibleTime = new Date()
	  } else if (document.visibilityState === 'hidden') {
	    documentHiddenTime = new Date()
	  }
	});
	if(useNotification&&app.isChrome()){
		navigator.serviceWorker.ready.then((registration) => {
			return app.requestNotificationPermission()
		}).then(() => {
			return app.subscribeAndDistribute()
		}).catch(function(err) {
			console.log(err)
		})
	}
})();