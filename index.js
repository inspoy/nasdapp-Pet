"use strict";

$(document).ready(function () {
    init();
});

const dappContactAddress = "n1iK34UtVDtgkCNEr42UW3ksX5PrSWv1we5";
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

    // 可见性
    $("#span-buycard").hide();
    $("#span-checkcard").hide();
    $("#main-content").hide();

    // 总人数
    neb.api.call(
        dappContactAddress,
        dappContactAddress,
        "0", "0", "100000", "200000",
        {
            "function": "getUserCount",
            "args": ""
        }).then(function (resp) {
        $("#user-count").text("总玩家人数:" + resp.result);
    });

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

    // 排行榜
    $("#action-get-rank").click(function () {
        getRank();
    });

    // 购买双倍积分卡
    const buyCard = function () {
        callNebPay("payForDoubleScore", "", function (resp) {
            if (typeof resp === "string" && resp.startsWith("Error")) {
                alert("购买失败:" + resp);
                return;
            }
            refreshStatus();
        });
    };
    $("#btn-buycard").click(buyCard);
    $("#btn-checkcard").click(buyCard);
};

const doActionTipsAnimate = function (ele) {
    ele.css({top: "0", opacity: 1});
    ele.animate({top: "-50%", opacity: 0}, "slow");
};

const refreshStatus = function () {
    callNeb("getPetInfo", "", function (petData) {
        try {
            if (typeof petData === "string" && petData === "宠物死亡！"){
                alert("你的宠物已经死了！");
                refreshStatus();
                return;
            }
            petData = JSON.parse(petData);
            console.log(petData);
            $("#property-score").text(petData.score);
            $("#property-gen").text("第" + petData.generation + "代");
            $("#image-pet").attr("src", "./img/gen" + petData.generation + ".png");
            $("#property-exppro").css("width", petData.exp + "%");
            $("#property-expval").text(petData.exp.toFixed(1) + "/100");

            if (petData.feedValue < 0) petData.feedValue = 0;
            $("#property-feedpro").css("width", petData.feedValue + "%");
            $("#property-feedval").text(petData.feedValue.toFixed(1) + "/100");

            $("#property-moodpro").css("width", petData.mood * 100 + "%");
            $("#property-moodval").text(petData.mood.toFixed(2) + "/1");

            const curTime = Date.parse(new Date());
            if (petData.doubleScoreTimeMillis > curTime) {
                // 有双倍积分卡
                $("#span-buycard").hide();
                $("#span-checkcard").show();
                $("#doublecardtime").text(((petData.doubleScoreTimeMillis - curTime) / 1000 / 60).toFixed(0));
            }
            else {
                // 没有双倍积分卡
                $("#span-buycard").show();
                $("#span-checkcard").hide();
            }
        }
        catch (e) {
            console.log(e);
        }
    });
    //获取总玩家人数
    callNeb("getUserCount", "", function (userCount) {
        console.log("总玩家人数:" + userCount);
        $("#user-count").text("总玩家人数:" + userCount);
    });

    callNeb("getContractBalance","",function(balance){
        console.log("奖池剩余金额" + parseInt("18000000000000000")/1000000000000000000 + "NAS");
        $("#text-balance").text("奖池余额：" + parseInt("18000000000000000")/1000000000000000000 + "NAS");
    });

    getRank();
};


const getRank = function(){
    callNeb("getRank", "", function (resp) {
        // 展示排行榜数据
        resp = JSON.parse(resp);
        $("#rank-table tbody").html("");
        for (let i = 0; i < resp.length; ++i) {
            const item = resp[i];
            const id = "n1..." + item.owner.substring(25);
            $("#rank-table").append("<tr><td>" + (i + 1) + "</td><td>" + id + "</td><td>" + item.score + "</td></tr>");
        }
        console.log("排行榜数据:" + resp);
    }, function (err) {
        alert("获取排行榜数据失败:" + err);
    })
}

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
