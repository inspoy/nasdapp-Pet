"use strict";

$(document).ready(function () {
    init();
});

const dappContactAddress = "n1zaPPhMn4R2C1xU65YimVHAj4miAZeneUt";
const nebulas = require("nebulas");
const neb = new nebulas.Neb();
neb.setRequest(new nebulas.HttpRequest("https://testnet.nebulas.io"));
const NebPay = require("nebpay");
const nebPay = new NebPay();
const sessionData = {
    userAddr: ""
};

const init = function () {
    console.log("Page Init...");

    // 登录
    $("#login-btn").click(function () {
        const addr = $("#wallet-address").val();
        if (addr === "") {
            alert("钱包地址不能为空");
            return;
        }
        sessionData.userAddr = addr;
        callNebPay("getPetInfo", "", function (resp) {
            if (typeof resp === "string" && resp.startsWith("Error")) {
                alert("登录失败:" + resp);
            }
            else {
                console.log(resp);
                // 每5秒自动刷新
                setInterval(refreshStatus, 5000);
                callNeb("getPetInfo", "", function (petData) {
                    console.log(petData);
                    $("#login").hide();
                    $("#main-content").show();
                    refreshStatus();
                }, function (err) {
                    alert("获取宠物信息失败:" + err);
                });
            }
        });
    });
    // 投食
    $("#action-feed").click(function () {
        callNebPay("feedPet", "", function (resp) {
            if (typeof resp === "string" && resp.startsWith("Error")) {
                alert("喂食失败:" + resp);
                return;
            }
            refreshStatus();
            doActionTipsAnimate($(".action-feed-info"));
        });
    });
    // 玩耍
    $("#action-play").click(function () {
        callNebPay("playWithPet", "", function (resp) {
            if (typeof resp === "string" && resp.startsWith("Error")) {
                alert("玩耍:" + resp);
                return;
            }
            refreshStatus();
            doActionTipsAnimate($(".action-play-info"));
        });
    });
};

const doActionTipsAnimate = function (ele) {
    ele.css({top: "0", opacity: 1});
    ele.animate({top: "-50%", opacity: 0}, "slow");
};

const refreshStatus = function () {
    callNeb("getPetInfo", "", function (petData) {
        try {
            petData = JSON.parse(petData);
            console.log(petData);
            $("#property-gen").text("第" + petData.generation + "代");
            $("#property-exppro").css("width", petData.exp + "%");
            $("#property-expval").text(petData.exp.toFixed(1) + "/100");

            $("#property-feedpro").css("width", petData.feedValue + "%");
            $("#property-feedval").text(petData.feedValue.toFixed(1) + "/100");

            $("#property-moodpro").css("width", petData.mood * 100 + "%");
            $("#property-moodval").text(petData.mood.toFixed(2) + "/1");
        }
        catch (e) {
            console.log(e);
        }
    });
};

const callNeb = function (func, args, callback, errCallback) {
    neb.api.call(
        sessionData.userAddr,
        dappContactAddress,
        "0", "0", "100000", "200000",
        {
            "function": func,
            "args": args
        }).then(function (resp) {
        callback(resp.result);
    }).catch(errCallback);
};

const callNebPay = function (func, args, callback) {
    nebPay.call(dappContactAddress, "0", func, args, {
        listener: callback
    });
};