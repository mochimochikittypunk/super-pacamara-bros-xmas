import Phaser from "phaser";
import { TouchControls } from "../ui/TouchControls";

type GameSceneData = {
  lives: number;
  hp: number;
  beans: number;
};

export class GameScene3 extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemiesSlow!: Phaser.Physics.Arcade.Group;
  private enemiesFast!: Phaser.Physics.Arcade.Group;
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private beans!: Phaser.Physics.Arcade.Group;
  private goal!: Phaser.Physics.Arcade.Sprite;
  private boss!: Phaser.Physics.Arcade.Sprite; // ★ ボス
  private bossWeakPoint!: Phaser.Physics.Arcade.Sprite; // ★ ボスの弱点（頭）

  private bossHp = 3;
  private bossInvincible = false;

  private touchControls!: TouchControls;

  private bgm?: Phaser.Sound.BaseSound;

  private lives = 3;
  private hp = 2;
  private beansCollected = 0;
  private totalBeans = 20;

  private hpText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private beansText!: Phaser.GameObjects.Text;

  private isOnGround = false;
  private jumpCount = 0;
  private maxJumpCount = 2;
  private prevJumpPressed = false;

  private isInvincible = false;

  private levelWidth = 4800;

  constructor() {
    super("GameScene3");
  }

  init(data: GameSceneData) {
    this.lives = data.lives ?? 3;
    this.hp = data.hp ?? 2;
    this.beansCollected = data.beans ?? 0;
  }

  preload() {
    // ▼ 画像として読み込むもの ▼

    // プレイヤー（サンタ）
    this.load.image("player", "/assets/santa.png");

    // 地面・足場（Block Land）
    this.load.image("ground", "/assets/ground.png");
    this.load.image("platform", "/assets/platform.png");

    // トゲ・豆（Block Land）
    this.load.image("spike", "/assets/spike.png");
    this.load.image("bean", "/assets/coffee_bean.png");

    // ゴール（Block Land から切り出したゴール用ブロック）
    this.load.image("tree", "/assets/tree.png");

    // 敵（遅い／速い／緑）
    this.load.image("enemySlow", "/assets/enemy_slow.png");
    this.load.image("enemyFast", "/assets/enemy_fast.png");
    this.load.image("enemyGreen", "/assets/enemy_green.png");
    this.load.image("enemyCray", "/assets/enemy_cray.png"); // ★ ボス画像

    // ★ BGM 読み込み（追加）
    this.load.audio("bgmMain", "/assets/bgm_main.mp3");

  }

  create() {
    const { height } = this.scale;

    // ワールド全体の物理範囲
    this.physics.world.setBounds(0, 0, this.levelWidth, height);
    this.cameras.main.setBackgroundColor("#38bdf8"); // 明るい空色

    // ▼ 背景（丘と雲）を追加：手前のオブジェクトよりゆっくりスクロールさせる
    const bgObjects: Phaser.GameObjects.GameObject[] = [];

    // 丘（手前）
    bgObjects.push(
      this.add
        .ellipse(300, height - 40, 300, 120, 0x16a34a) // x, y, 幅, 高さ, 色
        .setScrollFactor(0.4) // カメラに対する動きの速さ（小さいほど遠くに見える）
    );

    // 丘（奥）
    bgObjects.push(
      this.add
        .ellipse(900, height - 50, 400, 160, 0x166534)
        .setScrollFactor(0.4)
    );

    // ★ 背景テキスト追加
    const promoText = "Salvador Coffeeのクリスマスブレンド ”PRESS IT PRESS 2025” 好評 発売中 !!";
    const textStyle = {
      fontSize: "35px",
      color: "#ffffff", // 空色背景なので白
      fontFamily: "Pixelify Sans, sans-serif"
    };

    // ステージ幅いっぱいまで繰り返す
    for (let x = 200; x < this.levelWidth; x += 1500) {
      this.add.text(x, 200, promoText, textStyle)
        .setScrollFactor(0.8)
        .setOrigin(0, 0.5);
    }

    // 雲その1
    bgObjects.push(
      this.add
        .ellipse(200, 80, 80, 40, 0xffffff)
        .setScrollFactor(0.2)
    );
    bgObjects.push(
      this.add
        .ellipse(240, 70, 60, 30, 0xffffff)
        .setScrollFactor(0.2)
    );

    // 雲その2
    bgObjects.push(
      this.add
        .ellipse(600, 100, 90, 45, 0xffffff)
        .setScrollFactor(0.2)
    );
    bgObjects.push(
      this.add
        .ellipse(650, 90, 70, 35, 0xffffff)
        .setScrollFactor(0.2)
    );

    // 雲その3
    bgObjects.push(
      this.add
        .ellipse(1100, 70, 100, 50, 0xffffff)
        .setScrollFactor(0.2)
    );

    // ぜんぶ「一番うしろ」に送る（プレイヤーや地面より奥）
    bgObjects.forEach((obj) => (obj as Phaser.GameObjects.Image).setDepth(-10));

    // ▼ 足場グループ（静的）
    this.platforms = this.physics.add.staticGroup();

    // 地面ライン：ground.png を 64x32 のブロックとして並べる
    for (let x = 0; x < this.levelWidth; x += 64) {
      // ★ ステージ3：崖（穴）をさらに増やして難易度アップ
      // 穴の位置: 1000-1200, 2000-2250, 3000-3200, 4200-4400
      if ((x > 1000 && x < 1200) || (x > 2000 && x < 2250) || (x > 3000 && x < 3200) || (x > 4200 && x < 4400)) {
        continue;
      }

      const groundBlock = this.platforms.create(
        x + 32,
        height - 16,
        "ground"
      ) as Phaser.Physics.Arcade.Sprite;

      // 1マスの見た目を 64x32 に拡大して使う
      groundBlock.setDisplaySize(64, 32);
      groundBlock.refreshBody(); // 当たり判定も表示サイズに合わせる
    }

    // 浮いている足場（ステージ3はさらに難易度アップ）
    const platformPattern = [
      { x: 200, y: height - 110 },
      { x: 350, y: height - 170 },
      { x: 500, y: height - 130 },
      { x: 650, y: height - 200 },
      { x: 800, y: height - 150 },
      { x: 900, y: height - 120 },  // 崖前
      // 崖（1000-1200）の後
      { x: 1300, y: height - 180 },
      { x: 1500, y: height - 140 },
      { x: 1700, y: height - 190 },
      { x: 1850, y: height - 130 },  // 崖前
      // 崖（2000-2250）の後
      { x: 2300, y: height - 160 },
      { x: 2500, y: height - 200 },
      { x: 2700, y: height - 140 },
      { x: 2850, y: height - 170 },  // 崖前
      // 崖（3000-3200）の後
      { x: 3300, y: height - 150 },
      { x: 3500, y: height - 190 },
      { x: 3700, y: height - 130 },
      { x: 3900, y: height - 180 },
      { x: 4050, y: height - 140 },  // 崖前
      // 崖（4200-4400）の後
      { x: 4450, y: height - 160 }
    ];

    // ステージ3は独自レイアウト
    const platformData = platformPattern;

    platformData.forEach((p) => {
      const plat = this.platforms.create(
        p.x,
        p.y,
        "platform"
      ) as Phaser.Physics.Arcade.Sprite;

      // 1マスを「ゲーム内では 64x16 に見せる」
      plat.setDisplaySize(64, 16);
      plat.refreshBody();
    });

    // ▼ プレイヤー
    this.player = this.physics.add
      .sprite(100, height - 150, "player")
      .setCollideWorldBounds(true);

    (this.player.body as Phaser.Physics.Arcade.Body).setSize(32, 64);
    (this.player.body as Phaser.Physics.Arcade.Body).setOffset(0, 0);

    // ▼ 敵グループの作成
    this.enemiesSlow = this.physics.add.group();
    this.enemiesFast = this.physics.add.group();

    // 前半の敵（全て地面の上に配置）
    // 地面は height - 32、敵の高さ64pxなので、中心座標は height - 32 - 32 = height - 64
    // ★ ステージ3では敵の数を大幅に増加
    this.createEnemy(this.enemiesSlow, 400, height - 64, 40);  // slow
    this.createEnemy(this.enemiesFast, 700, height - 64, 80, "enemyGreen", 160);
    this.createEnemy(this.enemiesSlow, 950, height - 64, 40);  // slow
    this.createEnemy(this.enemiesFast, 1350, height - 64, 80);
    this.createEnemy(this.enemiesSlow, 1550, height - 64, 40);  // slow
    this.createEnemy(this.enemiesFast, 1800, height - 64, 80, "enemyGreen", 160);
    this.createEnemy(this.enemiesSlow, 2350, height - 64, 40);  // slow
    this.createEnemy(this.enemiesFast, 2650, height - 64, 80);
    this.createEnemy(this.enemiesSlow, 2950, height - 64, 40);  // slow
    this.createEnemy(this.enemiesFast, 3350, height - 64, 80, "enemyGreen", 160);
    this.createEnemy(this.enemiesSlow, 3750, height - 64, 40);  // slow
    this.createEnemy(this.enemiesFast, 4100, height - 64, 80);

    this.spikes = this.physics.add.staticGroup();

    // 前半のトゲ（4px下げる）
    const spike1 = this.spikes.create(
      600,
      height - 28,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spike1.setOrigin(0.5, 1);
    spike1.setDisplaySize(32, 32);
    spike1.refreshBody();

    const spike2 = this.spikes.create(
      1250,  // 崖（1000-1200）を避けた位置
      height - 28,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spike2.setOrigin(0.5, 1);
    spike2.setDisplaySize(32, 32);
    spike2.refreshBody();

    // 後半のトゲ（+2400）
    const spike3 = this.spikes.create(
      2900,  // 崖（3000-3200）を避けた位置
      height - 28,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spike3.setOrigin(0.5, 1);
    spike3.setDisplaySize(32, 32);
    spike3.refreshBody();

    const spike4 = this.spikes.create(
      1100 + 2400,
      height - 28,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spike4.setOrigin(0.5, 1);
    spike4.setDisplaySize(32, 32);
    spike4.refreshBody();

    // ★ ステージ3: spike_high（幅2倍、高さ3倍）
    // 開発ルール：platformの真下に置かない、崖に浮かさない、ゴールに被せない
    // さらに8px下げる -> height - 16
    const spikeHigh1 = this.spikes.create(
      550,  // platformと重ならない位置
      height - 16,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spikeHigh1.setOrigin(0.5, 1);
    spikeHigh1.setDisplaySize(64, 96); // 幅2倍、高さ3倍
    spikeHigh1.refreshBody();

    const spikeHigh2 = this.spikes.create(
      1600,  // platformと重ならない位置
      height - 16,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spikeHigh2.setOrigin(0.5, 1);
    spikeHigh2.setDisplaySize(64, 96);
    spikeHigh2.refreshBody();

    const spikeHigh3 = this.spikes.create(
      2600,  // platformと重ならない位置
      height - 16,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spikeHigh3.setOrigin(0.5, 1);
    spikeHigh3.setDisplaySize(64, 96);
    spikeHigh3.refreshBody();

    const spikeHigh4 = this.spikes.create(
      3600,  // platformと重ならず、ゴール（x=4700）からも離れた位置
      height - 16,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spikeHigh4.setOrigin(0.5, 1);
    spikeHigh4.setDisplaySize(64, 96);
    spikeHigh4.refreshBody();

    // ★ 崖（穴）にspikeを敷き詰める（さらに16px下 -> height）
    // 穴の正確な範囲（ブロック単位）に合わせて調整
    const cliffRanges = [
      [1024, 1216], // 1000-1200 の穴の実体
      [2048, 2304], // 2000-2250 の穴の実体
      [3008, 3200], // 3000-3200 の穴の実体
      [4224, 4416]  // 4200-4400 の穴の実体
    ];

    cliffRanges.forEach(([start, end]) => {
      // 32px間隔で配置
      for (let x = start + 16; x < end; x += 32) {
        const spike = this.spikes.create(
          x,
          height, // 通常より32px下（height - 32 + 32 = height）
          "spike"
        ) as Phaser.Physics.Arcade.Sprite;
        spike.setOrigin(0.5, 1);
        spike.setDisplaySize(32, 32);
        spike.refreshBody();
      }
    });

    // ▼ 豆（重力なし・動かないグループ）
    this.beans = this.physics.add.group({
      allowGravity: false,
      immovable: true
    });
    this.spawnBeans(height);

    // ▼ ゴール（Xmas BOX 的なブロック）
    this.goal = this.physics.add
      .sprite(this.levelWidth - 100, height - 120, "tree")
      .setImmovable(true)
      .setCollideWorldBounds(false);

    // ゴール画像の見た目サイズを調整（※好みで変えてOK）
    this.goal.setDisplaySize(80, 200);

    // 重力の影響を受けないようにする
    (this.goal.body as Phaser.Physics.Arcade.Body).allowGravity = false;

    // ▼ ボス（enemy_cray）の生成
    // ゴール手前（崖の後）に配置。足が地面（height-32）に着くように調整
    // さらに16px下げる: height - 192 + 16 = height - 176
    this.boss = this.physics.add.sprite(4500, height - 176, "enemyCray");
    this.boss.setDisplaySize(320, 320); // 5倍サイズ（以前の半分）
    this.boss.setCollideWorldBounds(true);
    this.boss.setBounce(0);
    this.boss.setImmovable(true); // プレイヤーに押されないようにする

    // 物理ボディを小さくして、見た目と合わせる（余白を削る）
    // ★ 当たり判定（ダメージを受ける範囲）：中心かつ目の高さ、32x32
    // Offset X: (320 - 32) / 2 = 144
    // Offset Y: 目の高さを上から120pxくらいと仮定 -> 120
    (this.boss.body as Phaser.Physics.Arcade.Body).setSize(32, 32);
    (this.boss.body as Phaser.Physics.Arcade.Body).setOffset(144, 120);

    // ボスは重力なし（空中に浮遊して移動）
    (this.boss.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // ▼ ボスの弱点（踏める位置）：中心かつ頭の高さ、64x64
    // ボスに追従させる不可視のスプライト
    this.bossWeakPoint = this.physics.add.sprite(4500, height - 176, "enemyCray"); // 画像はダミー（見えなくする）
    this.bossWeakPoint.setVisible(false);
    this.bossWeakPoint.setSize(64, 64);
    (this.bossWeakPoint.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // 初期HP
    this.bossHp = 3;
    this.bossInvincible = false;
    // 初期移動（左へ）
    this.boss.setVelocityX(-100);

    // ▼ コライダー／オーバーラップ設定

    // プレイヤーと足場
    this.physics.add.collider(this.player, this.platforms, () => {
      this.isOnGround = true;
      this.jumpCount = 0;
    });

    // 敵と足場
    this.physics.add.collider(this.enemiesSlow, this.platforms);
    this.physics.add.collider(this.enemiesFast, this.platforms);
    this.physics.add.collider(this.boss, this.platforms); // ボスと足場

    // プレイヤーとゴール
    this.physics.add.collider(this.player, this.goal, this.handleGoal, undefined, this);

    // プレイヤーと敵
    this.physics.add.collider(
      this.player,
      this.enemiesSlow,
      this.handlePlayerEnemyCollision,
      undefined,
      this
    );
    this.physics.add.collider(
      this.player,
      this.enemiesFast,
      this.handlePlayerEnemyCollision,
      undefined,
      this
    );

    // プレイヤーとボス（本体＝ダメージ受ける）
    this.physics.add.collider(
      this.player,
      this.boss,
      this.handlePlayerBossDamage, // ダメージ処理へ
      undefined,
      this
    );

    // プレイヤーとボスの弱点（頭＝踏める）
    this.physics.add.overlap( // overlapにして、すり抜けつつ判定
      this.player,
      this.bossWeakPoint,
      this.handlePlayerBossStomp, // 踏みつけ処理へ
      undefined,
      this
    );

    // プレイヤーとトゲ
    this.physics.add.collider(
      this.player,
      this.spikes,
      () => this.takeDamage(true),
      undefined,
      this
    );

    // プレイヤーと豆（オーバーラップ＝すり抜け）
    this.physics.add.overlap(this.player, this.beans, this.collectBean, undefined, this);

    // ▼ カメラ追従
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, this.levelWidth, height);

    // ▼ キーボード入力・タッチ入力
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // HUD
    this.createHUD();

    // タッチコントローラ
    this.touchControls = new TouchControls(this);
    this.touchControls.create();

    // ★ BGM 再生（ループあり）をフィールドに保存
    this.bgm = this.sound.add("bgmMain", {
      volume: 0.5,
      loop: true
    });
    this.bgm.play();
  }

  // 敵生成：その場パトロール用設定
  private createEnemy(
    group: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    speed: number,
    textureOverride?: string,  // ★ オプションでテクスチャを指定可能に
    patrolRange?: number  // ★ オプションでパトロール範囲を指定可能に（デフォルト80）
  ) {
    // ★ textureOverrideがあればそれを使用、なければ速度で判定
    const texture = textureOverride ?? (speed > 50 ? "enemyFast" : "enemySlow");

    const enemy = group.create(
      x,
      y,
      texture
    ) as Phaser.Physics.Arcade.Sprite;

    enemy.setCollideWorldBounds(false);
    enemy.setBounce(0, 0);

    // 基本速度（絶対値）を保存しておく
    const baseSpeed = Math.abs(speed);
    enemy.setData("startX", x); // パトロールの中心位置
    enemy.setData("speed", baseSpeed);
    enemy.setData("patrolRange", patrolRange ?? 80); // ★ パトロール範囲を保存（デフォルト80）

    // 最初の向きはランダム（左 or 右）
    const dir = Math.random() < 0.5 ? -1 : 1;
    enemy.setVelocityX(baseSpeed * dir);

    // ▼ 見た目サイズ＆当たり判定を 64x64 に
    enemy.setDisplaySize(64, 64);

    // Origin はデフォルト (0.5, 0.5) のまま（中心基準）
    // Physics Body のサイズ設定
    (enemy.body as Phaser.Physics.Arcade.Body).setSize(64, 64);
    (enemy.body as Phaser.Physics.Arcade.Body).setOffset(0, 0);

    // ★ 重力を無効化（敵は横パトロールのみで、落下する必要がない）
    (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Y座標をそのまま設定（呼び出し側で地面からの適切な高さが計算済み）
    enemy.y = y;

    // ★ ステージ3: enemy_slowにジャンプ用のデータを追加
    if (texture === "enemySlow") {
      // ジャンプさせるために重力を有効化
      (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(true);
      enemy.setData("canJump", true);
      enemy.setData("nextJumpTime", this.time.now + 4000); // 初回は4秒後
    }
  }

  // 豆の配置
  private spawnBeans(height: number) {
    // 前半の配置パターン（いままでの20個）
    const basePositions: [number, number][] = [
      [200, height - 160],
      [260, height - 160],
      [320, height - 200],
      [700, height - 220],
      [760, height - 220],
      [820, height - 260],
      [950, height - 260],
      [1200, height - 180],
      [1260, height - 240],
      [1320, height - 180],
      [1500, height - 160],
      [1560, height - 200],
      [1620, height - 240],
      [1700, height - 240],
      [1760, height - 280],
      [1820, height - 240],
      [1900, height - 200],
      [1960, height - 160],
      [2050, height - 180],
      [2150, height - 200]
    ];

    // ▼ 前半＋後半（+2400ずらした位置）をまとめた配列
    const positions: [number, number][] = [
      ...basePositions,
      ...basePositions.map(([x, y]) => [x + 2400, y] as [number, number])
    ];

    // ▼ ここで「positions 全部」に対して豆を作る
    positions.forEach(([x, y]) => {
      const bean = this.beans.create(
        x,
        y,
        "bean"
      ) as Phaser.Physics.Arcade.Image;

      // 見た目を少し大きめに表示
      bean.setDisplaySize(24, 24);

      // 当たり判定を少し広めの丸にする
      bean.setCircle(10);
      bean.setBounce(0);

      // 念のため、個別にも重力OFF & 動かない設定
      const body = bean.body as Phaser.Physics.Arcade.Body;
      body.allowGravity = false;
      body.immovable = true;
    });
  }

  private createHUD() {
    const { width } = this.scale;

    this.livesText = this.add
      .text(16, 16, `Lives: ${this.lives}`, {
        fontSize: "18px",
        color: "#f9fafb"
      })
      .setScrollFactor(0);

    this.hpText = this.add
      .text(16, 40, `HP: ${this.hp}`, {
        fontSize: "18px",
        color: "#f97316"
      })
      .setScrollFactor(0);

    this.beansText = this.add
      .text(width - 16, 16, this.getBeansLabel(), {
        fontSize: "18px",
        color: "#e5e7eb"
      })
      .setOrigin(1, 0)
      .setScrollFactor(0);
  }

  private getBeansLabel() {
    return `${this.beansCollected} / 10 pc`;
  }

  update() {
    const height = this.scale.height;

    // 落下死
    if (this.player.y > height + 50) {
      this.takeDamage(true);
    }

    // 敵のパトロール更新
    this.updateEnemies();
    this.updateBoss(); // ★ ボスの更新

    // 入力取得
    const moveLeft = this.cursors.left?.isDown || this.touchControls.leftPressed || false;
    const moveRight = this.cursors.right?.isDown || this.touchControls.rightPressed || false;

    const speed = 200;
    if (moveLeft && !moveRight) {
      this.player.setVelocityX(-speed);
    } else if (moveRight && !moveLeft) {
      this.player.setVelocityX(speed);
    } else {
      this.player.setVelocityX(0);
    }

    const jumpInput =
      this.spaceKey.isDown ||
      this.cursors.up?.isDown ||      // ★ ここを追加
      this.touchControls.jumpPressed ||
      false;

    if (jumpInput && !this.prevJumpPressed) {
      this.handleJump();
    }
    this.prevJumpPressed = jumpInput;

    this.isOnGround = (this.player.body as Phaser.Physics.Arcade.Body).blocked.down;
    if (this.isOnGround && (this.player.body as Phaser.Physics.Arcade.Body).velocity.y >= 0) {
      this.jumpCount = 0;
    }

    this.hpText.setText(`HP: ${this.hp}`);
    this.beansText.setText(this.getBeansLabel());
  }

  private handleJump() {
    // ダブルジャンプ：地上＋空中1回
    if (this.isOnGround || this.jumpCount < this.maxJumpCount - 0) {
      const jumpVelocity = -420;
      this.player.setVelocityY(jumpVelocity);
      this.jumpCount++;
      this.isOnGround = false;
    }
  }

  private updateEnemies() {
    this.enemiesSlow.getChildren().forEach((enemyObj) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
      this.updateEnemy(enemy);
    });

    this.enemiesFast.getChildren().forEach((enemyObj) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
      this.updateEnemy(enemy);
    });
  }

  // 敵のパトロール処理
  private updateEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    const body = enemy.body as Phaser.Physics.Arcade.Body;

    const startX = (enemy.getData("startX") as number) ?? enemy.x;
    const baseSpeed = (enemy.getData("speed") as number) ?? 40;
    const patrolRange = (enemy.getData("patrolRange") as number) ?? 80; // ★ パトロール範囲を取得

    // この範囲（startX ± patrolRange）で左右にパトロールさせる
    const leftLimit = startX - patrolRange;
    const rightLimit = startX + patrolRange;

    if (enemy.x < leftLimit) {
      enemy.setVelocityX(baseSpeed);
    } else if (enemy.x > rightLimit) {
      enemy.setVelocityX(-baseSpeed);
    }

    // もし壁などにぶつかったら反転する（保険）
    if (body.blocked.left) {
      enemy.setVelocityX(baseSpeed);
    } else if (body.blocked.right) {
      enemy.setVelocityX(-baseSpeed);
    }

    // ★ ステージ3: enemy_slowが定期的にジャンプ（4秒ごと）
    const canJump = enemy.getData("canJump");
    if (canJump && body.blocked.down) {
      const nextJumpTime = (enemy.getData("nextJumpTime") as number) ?? 0;
      if (this.time.now >= nextJumpTime) {
        // ジャンプ（高さを3倍に：-350 * 3 = -1050）
        enemy.setVelocityY(-1050);
        // 次のジャンプ時刻を設定（4秒固定）
        enemy.setData("nextJumpTime", this.time.now + 4000);
      }
    }
  }

  private handlePlayerEnemyCollision(
    playerObj: any,
    enemyObj: any
  ) {
    if (this.isInvincible) return;

    const player = playerObj as Phaser.Physics.Arcade.Sprite;
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
    // ★ 判定緩和 (再調整):
    // Bodyの左上Y座標を比較する。
    // プレイヤーが敵の上に乗っている場合、playerBody.y は enemyBody.y より約64px小さくなるはず。
    // 横に並んでいる場合はほぼ同じになる。
    // そのため、ある程度（例えば40px）以上プレイヤーが上にいれば「踏んだ」とみなす。
    const enemyBody = enemy.body as Phaser.Physics.Arcade.Body;
    const playerBody = player.body as Phaser.Physics.Arcade.Body;

    const isAbove = playerBody.y < enemyBody.y - 40;
    const isFalling = playerBody.velocity.y > -100; // 上昇中でなければOK

    if (isAbove && isFalling) {
      enemy.destroy();
      player.setVelocityY(-300);
      return;
    }

    this.takeDamage(false, enemy);
  }

  private takeDamage(fall: boolean, enemy?: Phaser.Physics.Arcade.Sprite) {
    if (this.isInvincible) return;

    // まずHPを1減らす
    this.hp -= 1;

    // HPがまだ残っていて、落下死ではない場合 → ノックバック＆無敵時間だけ
    if (this.hp > 0 && !fall) {
      this.knockbackFrom(enemy);
      this.startInvincible();
      return;
    }

    // ここに来るのは「ライフを1つ失う」ケース
    this.lives -= 1;

    // ★ ライフを失ったタイミングで BGM を止める
    this.bgm?.stop();

    if (this.lives > 0) {
      // 残機がまだある → ステージをリスタート
      this.scene.restart({
        lives: this.lives,
        hp: 2,
        beans: this.beansCollected
      } as GameSceneData);
    } else {
      // 残機ゼロ → ゲームオーバーシーンへ
      this.scene.start("GameOverScene");
    }
  }

  private knockbackFrom(enemy?: Phaser.Physics.Arcade.Sprite) {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    let dir = -1;
    if (enemy) {
      dir = this.player.x < enemy.x ? -1 : 1;
    }
    playerBody.velocity.x = 250 * -dir;
    playerBody.velocity.y = -200;
  }

  private startInvincible() {
    this.isInvincible = true;
    const blink = this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      yoyo: true,
      repeat: 5,
      duration: 120
    });

    this.time.delayedCall(800, () => {
      this.isInvincible = false;
      blink.stop();
      this.player.setAlpha(1);
    });
  }

  private collectBean(
    _playerObj: any,
    beanObj: any
  ) {
    beanObj.destroy();
    this.beansCollected += 1;
  }

  private handleGoal() {
    // ★ BGMを止める（再生してなければ何もしない）
    this.bgm?.stop();
    this.scene.start("ClearSceneSimple", {
      beans: this.beansCollected,
      totalBeans: this.totalBeans
    });
  }
  private updateBoss() {
    if (!this.boss || !this.boss.active) return;

    const body = this.boss.body as Phaser.Physics.Arcade.Body;

    // 徘徊ロジック（単純な左右移動）
    // 崖や壁で反転させたいが、サイズが大きいので levelWidth 内で制御
    // ゴール付近(4200〜4700)をうろうろさせる
    if (this.boss.x < 4200 && body.velocity.x < 0) {
      this.boss.setVelocityX(100);
    } else if (this.boss.x > 4700 && body.velocity.x > 0) {
      this.boss.setVelocityX(-100);
    }

    // 止まってしまった場合の再始動（保険）
    if (Math.abs(body.velocity.x) < 10) {
      this.boss.setVelocityX(-100);
    }

    // ★ 弱点をボスに追従させる
    // 弱点は頭の高さ（目の少し上）。
    // ボスのHitbox（目）の中心Yは boss.y + 120 + 16 = boss.y + 136
    // 弱点の中心Yをその60px上とする -> boss.y + 76
    // ボスの中心Xは boss.x
    if (this.bossWeakPoint && this.bossWeakPoint.active) {
      this.bossWeakPoint.setPosition(this.boss.x, this.boss.y - 60); // ボスの中心より60px上（頭付近）
      // 速度も同期（必要なら）
      (this.bossWeakPoint.body as Phaser.Physics.Arcade.Body).velocity.copy(body.velocity);
    }
  }

  // ボス本体に触れたらダメージ
  private handlePlayerBossDamage(playerObj: any, _bossObj: any) {
    if (this.isInvincible) return;
    const boss = _bossObj as Phaser.Physics.Arcade.Sprite;
    this.takeDamage(false, boss);
  }

  // 弱点（頭）に触れたら踏みつけ判定
  private handlePlayerBossStomp(playerObj: any, _weakPointObj: any) {
    if (this.isInvincible) return;

    const player = playerObj as Phaser.Physics.Arcade.Sprite;
    const playerBody = player.body as Phaser.Physics.Arcade.Body;

    // 落下中のみ有効
    const isFalling = playerBody.velocity.y > -100;

    if (isFalling) {
      // ボスにダメージ
      this.bossTakeDamage(this.boss);
      player.setVelocityY(-600); // 大きくバウンド
    }
  }

  private bossTakeDamage(boss: Phaser.Physics.Arcade.Sprite) {
    if (this.bossInvincible) return;

    this.bossHp -= 1;
    this.bossInvincible = true;

    // 点滅演出
    this.tweens.add({
      targets: boss,
      alpha: 0.5,
      yoyo: true,
      repeat: 3,
      duration: 100,
      onComplete: () => {
        this.bossInvincible = false;
        boss.setAlpha(1);
      }
    });

    if (this.bossHp <= 0) {
      // 倒した！
      boss.destroy();
      // 何かエフェクトやスコア加算があればここで
    }
  }
}