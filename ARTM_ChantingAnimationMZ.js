// ===================================================
// ARTM_ChantingAnimationMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// =============================================================================
// [Version]
// 1.0.0 初版
// 1.0.x 軽微な不具合修正
// 1.1.0 魔法以外のスキルタイプにも対応
// 1.1.x 稀に詠唱アニメーションが別詠唱者によってかき消されてしまう不具合を修正
// 1.2.0 拙作プラグイン「ARTM_EnemyAsActorSpriteMZ」に対応
// 1.2.1 詠唱アニメーションの初期化不備を修正
// 1.2.2 勝利時に詠唱アニメーションを強制停止するよう修正、リファクタリングを実施
// =============================================================================
/*:ja
 * @target MZ
 * @plugindesc 詠唱中アニメーションを追加するMZ専用プラグイン
 * @author Artemis
 *
 * 
 * @help ARTM_ChantingAnimationMZ.js
 * 詠唱中アニメーションを追加するMZ専用プラグインです。
 *
 *--------------
 * ご使用方法
 *--------------
 * 本プラグインを導入し、スキルのメモ欄に
 * 下記形式でアニメーションIDを設定して下さい。
 *
 * <CA_ANIM_ID:アニメーションID>
 *
 * 【例】アニメーションID：40を使用する
 *  <CA_ANIM_ID:40>
 *
 *---------------------------------------------
 * NRP_Dynamicシリーズと併用される場合の注意
 *---------------------------------------------
 * プラグイン管理画面にて本プラグインを必ずNRP_Dynamicシリーズより
 * “上”に置いて下さい。
 *
 *
 * プラグインコマンドはありません。
 */
 
(() => {

    const PLG_NAME = "ARTM_ChantingAnimationMZ";
    const TAG_NAME = "CA_ANIM_ID";

    //-----------------------------------------------------------------------------
    // function
    //
    function getCantAnimationId(battler) {
        const action = battler.action(0);
        const item = action ? action._item : null;
        const emptyId = -1;
        if (item && item.isSkill()) {
            return item.object().meta.CA_ANIM_ID || emptyId;
        } else {
            return emptyId;
        }
    }

    //-----------------------------------------------------------------------------
    // Game_Temp
    //
    const _Game_Temp_initialize = Game_Temp.prototype.initialize;
    Game_Temp.prototype.initialize = function() {
        _Game_Temp_initialize.call(this);
        this._animationQueueCA = [];
    };

    Game_Temp.prototype.requestAnimationCA = function(target, animationId) {
        if ($dataAnimations[animationId]) {
            const request = {
                targets: [target],
                animationId: animationId,
                mirror: false
            };
            this._animationQueueCA.push(request);
            target.startAnimationCA();
        }
    };

    Game_Temp.prototype.retrieveAnimationCA = function() {
        return this._animationQueueCA.shift();
    };

    //-----------------------------------------------------------------------------
    // Game_BattlerBase
    //
    const _Game_BattlerBase_initMembers = Game_BattlerBase.prototype.initMembers;
    Game_BattlerBase.prototype.initMembers = function() {
        _Game_BattlerBase_initMembers.call(this);
        this._animationPlayingCA = false;
        this._animationErrCountCA = 0;
        this._anmPitch = 0;
    };

    Game_BattlerBase.prototype.animationPlayingCA = function() {
        return this._animationPlayingCA;
    };

    Game_BattlerBase.prototype.startAnimationCA = function() {
        this._animationPlayingCA = true;
    };

    Game_BattlerBase.prototype.endAnimationCA = function() {
        this._animationPlayingCA = false;
    };

    Game_BattlerBase.prototype.nextAnimErrCountCA = function() {
        return ++this._animationErrCountCA;
    };

    Game_BattlerBase.prototype.initAnmErrCountCA = function() {
        this._animationErrCountCA = 0;
    };

    //-----------------------------------------------------------------------------
    // Sprite_Battler
    //
    Sprite_Battler.prototype.updateChantingAnimation = function(battler) {
        if (battler._tpbState === "casting") {
            const id = getCantAnimationId(battler);
            const action = battler.action(0);
            const item = action ? action.item() : null;
            const speed = item ? item.speed : 0;
            if (id < 0 ) {
                return;
            } else if (id > 0 && speed < 0 && !battler.animationPlayingCA()) {
                $gameTemp.requestAnimationCA(battler, id);
                battler.initAnmErrCountCA();
            } else if (battler.nextAnimErrCountCA() > battler._anmPitch) {
                battler.initAnmErrCountCA();
                battler.endAnimationCA();
            };
        } else if (battler.isWaiting()) {
            battler.endAnimationCA();
        }
    };

    //-----------------------------------------------------------------------------
    // Sprite_Actor
    //
    const _Sprite_Actor_updateMotion = Sprite_Actor.prototype.updateMotion;
    Sprite_Actor.prototype.updateMotion = function() {
        _Sprite_Actor_updateMotion.call(this);
        if (!["battleEnd", ""].includes(BattleManager._phase)) {
            this.updateChantingAnimation(this._actor);
        }
    };

    //-----------------------------------------------------------------------------
    // Sprite_Enemy
    //
    const _Sprite_Enemy_updateEffect = Sprite_Enemy.prototype.updateEffect;
    Sprite_Enemy.prototype.updateEffect = function() {
        _Sprite_Enemy_updateEffect.call(this);
        if (!this._enemy._asEnemy) {
            this.updateChantingAnimation(this._enemy);
        }
    };

    //-----------------------------------------------------------------------------
    // Sprite_AnimationCA
    //
    function Sprite_AnimationCA() {
        this.initialize(...arguments);
    }

    Sprite_AnimationCA.prototype = Object.create(Sprite_Animation.prototype);
    Sprite_AnimationCA.prototype.constructor = Sprite_AnimationCA;

    Sprite_AnimationCA.prototype.initialize = function() {
        Sprite_Animation.prototype.initialize.call(this);
    };

    //-----------------------------------------------------------------------------
    // Spriteset_Base
    //
    const _Spriteset_Base_initialize = Spriteset_Base.prototype.initialize;
    Spriteset_Base.prototype.initialize = function() {
        _Spriteset_Base_initialize.call(this);
        this._animationSpritesCA = [];
    };

    Spriteset_Base.prototype.createAnimationCA = function(request) {
        const animation = $dataAnimations[request.animationId];
        const targets = request.targets;
        const mirror = request.mirror;
        let delay = this.animationBaseDelay();
        const nextDelay = this.animationNextDelay();
        if (this.isAnimationForEach(animation)) {
            this.createAnimationSpriteCA(targets, animation, mirror, delay);
            delay += nextDelay;
        } else {
            this.createAnimationSpriteCA(targets, animation, mirror, delay);
        }
    };

    Spriteset_Base.prototype.createAnimationSpriteCA = function(targets, animation, mirror, delay) {
        const sprite = new Sprite_AnimationCA();
        const targetSprites = this.makeTargetSprites(targets);
        const baseDelay = this.animationBaseDelay();
        const previous = delay > baseDelay ? this.lastAnimationSprite() : null;
        if (this.animationShouldMirror(targets[0])) {
            mirror = !mirror;
        }
        sprite.targetObjects = targets;
        sprite.setup(targetSprites, animation, mirror, delay, previous);
        sprite._animation.displayType = -1;
        targets[0]._anmPitch = parseInt(120 / (sprite._animation.speed / 100)) * 1.5;
        this._effectsContainer.addChild(sprite);
        this._animationSpritesCA.push(sprite);
    };

    const _Spriteset_Base_updateAnimations = Spriteset_Base.prototype.updateAnimations;
    Spriteset_Base.prototype.updateAnimations = function() {
        _Spriteset_Base_updateAnimations.call(this);
        for (const sprite of this._animationSpritesCA) {
            const target = sprite.targetObjects[0];
            if (!sprite.isPlaying() || target._tpbState !== "casting") {
                this.removeAnimationCA(sprite);
            } else if (["battleEnd", ""].includes(BattleManager._phase)) {
                this.removeAnimationCA(sprite);           
            }
        }
        this.processAnimationRequestsCA();
    };

    Spriteset_Base.prototype.processAnimationRequestsCA = function() {
        for (;;) {
            const request = $gameTemp.retrieveAnimationCA();
            if (request) {
                this.createAnimationCA(request);
            } else {
                break;
            }
        }
    };


    Spriteset_Base.prototype.removeAnimationCA = function(sprite) {
        const target = sprite.targetObjects[0];
        this._animationSpritesCA.remove(sprite);
        this._effectsContainer.removeChild(sprite);
        target.endAnimationCA();
        sprite.destroy();
    };

    const _BattleManager_startAction = BattleManager.startAction;
    BattleManager.startAction = function() {
        _BattleManager_startAction.call(this);
        this._subject.endAnimationCA();
    };

})();