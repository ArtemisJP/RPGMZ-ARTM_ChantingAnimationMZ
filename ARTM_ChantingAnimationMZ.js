// ===================================================
// ARTM_ChantingAnimationMZ
// Copyright (c) 2021 Artemis
// This software is released under the MIT license.
// http://opensource.org/licenses/mit-license.php
// ===================================================
// [Version]
// 1.0.0 初版
// 1.0.1 一部シーンでスキル速度補正が＋でもアニメーション再生される不具合を修正
// 1.0.2 詠唱アニメーションが一定ターン経過以降に一切発動しなくなる不具合を修正
// =================================================================
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
        const item = battler.action(0)._item;
        const emptyId = -1;
        if (item.isSkill()) {
            return item.object().meta.CA_ANIM_ID || emptyId;
        } else {
            return emptyId;
        }
    }

    //-----------------------------------------------------------------------------
    // Game_Temp
    //
    Game_Temp.prototype.requestAnimationCA = function(target, animationId)
    {
        target.startAnimationCA();
        Game_Temp.prototype.requestAnimation.call(this, [target], animationId);
        this._isUsingCA = true;
    };

    Game_Temp.prototype.resetUsingCA = function()
    {
        this._isUsingCA = false;
    };

    Game_Temp.prototype.isUsingCA = function()
    {
        return this._isUsingCA;
    };

    //-----------------------------------------------------------------------------
    // Game_BattlerBase
    //
    const _Game_BattlerBase_initMembers = Game_BattlerBase.prototype.initMembers;
    Game_BattlerBase.prototype.initMembers = function() {
        _Game_BattlerBase_initMembers.call(this);
        this._isUsingCA = false;
        this._animationPlayingCA = false;
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

    //-----------------------------------------------------------------------------
    // Sprite_Battler
    //
    Sprite_Battler.prototype.updateChantingAnimation = function(battler) {
        if (battler.isChanting() && battler._tpbState !== "acting") {
            const id = getCantAnimationId(battler);
            const speed = battler._actions[0].item().speed;
            if (id > 0 && speed < 0 && !battler.animationPlayingCA()) {
                $gameTemp.requestAnimationCA(battler, id);
            }
        }
    };

    //-----------------------------------------------------------------------------
    // Sprite_Actor
    //
    const _Sprite_Actor_updateMotion = Sprite_Actor.prototype.updateMotion;
    Sprite_Actor.prototype.updateMotion = function() {
        _Sprite_Actor_updateMotion.call(this);
        this.updateChantingAnimation(this._actor);
    };

    //-----------------------------------------------------------------------------
    // Sprite_Enemy
    //
    const _Sprite_Enemy_updateEffect = Sprite_Enemy.prototype.updateEffect;
    Sprite_Enemy.prototype.updateEffect = function() {
        _Sprite_Enemy_updateEffect.call(this);
        this.updateChantingAnimation(this._enemy);
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

    const _Spriteset_Base_createAnimationSprite = Spriteset_Base.prototype.createAnimationSprite;
    Spriteset_Base.prototype.createAnimationSprite = function(
        targets, animation, mirror, delay
    ) {
        const target = targets[0];
        if ($gameTemp.isUsingCA() && target.animationPlayingCA()) {
            const sprite = new Sprite_AnimationCA();
            const targetSprites = this.makeTargetSprites(targets);
            const baseDelay = this.animationBaseDelay();
            const previous = delay > baseDelay ? this.lastAnimationSprite() : null;
            if (this.animationShouldMirror(target)) {
                mirror = !mirror;
            }
            sprite.targetObjects = targets;
            sprite.setup(targetSprites, animation, mirror, delay, previous);
            sprite._animation.displayType = -1;
            this._effectsContainer.addChild(sprite);
            this._animationSpritesCA.push(sprite);
            $gameTemp.resetUsingCA();
            return;
        }
        _Spriteset_Base_createAnimationSprite.call(this, targets, animation, mirror, delay);
    };

    const _Spriteset_Base_updateAnimations = Spriteset_Base.prototype.updateAnimations;
    Spriteset_Base.prototype.updateAnimations = function() {
        for (const sprite of this._animationSpritesCA) {
            const target = sprite.targetObjects[0];
            if (!sprite.isPlaying() || !target.isChanting()) {
                this.removeAnimationCA(sprite);
            }
        }
        _Spriteset_Base_updateAnimations.call(this);
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