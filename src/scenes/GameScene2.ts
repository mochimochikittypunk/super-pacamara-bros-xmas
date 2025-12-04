import Phaser from "phaser";
import { TouchControls } from "../ui/TouchControls";

type GameSceneData = {
  lives: number;
  hp: number;
  beans: number;
};

export class GameScene2 extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private enemiesSlow!: Phaser.Physics.Arcade.Group;
  private enemiesFast!: Phaser.Physics.Arcade.Group;
  private spikes!: Phaser.Physics.Arcade.StaticGroup;
  private beans!: Phaser.Physics.Arcade.Group;
  private goal!: Phaser.Physics.Arcade.Sprite;

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
    super("GameScene2");
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
    this.load.image("bean", "/assets/bean.png");

    // ゴール（Block Land から切り出したゴール用ブロック）
    this.load.image("tree", "/assets/tree.png");

    // 敵（遅い／速い／緑）
    this.load.image("enemySlow", "/assets/enemy_slow.png");
    this.load.image("enemyFast", "/assets/enemy_fast.png");
    this.load.image("enemyGreen", "/assets/enemy_green.png");

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
      color: "#facc15", // 黄色
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
      // ★ ステージ2：崖（穴）を増やして難易度アップ
      // 穴の位置: 1300-1500, 2400-2600, 3800-4000
      if ((x > 1300 && x < 1500) || (x > 2400 && x < 2600) || (x > 3800 && x < 4000)) {
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

    // 浮いている足場（ステージ2は難易度アップ）
    const platformPattern = [
      { x: 250, y: height - 100 },   // 低め
      { x: 500, y: height - 160 },   // 高め
      { x: 750, y: height - 120 },
      { x: 1000, y: height - 200 },  // 高め
      { x: 1150, y: height - 140 },  // 崖前
      // 崖（1300-1500）の後
      { x: 1600, y: height - 160 },
      { x: 1850, y: height - 120 },
      { x: 2100, y: height - 180 },
      { x: 2250, y: height - 140 },  // 崖前
      // 崖（2400-2600）の後
      { x: 2700, y: height - 150 },
      { x: 3000, y: height - 200 },  // 高め
      { x: 3300, y: height - 120 },
      { x: 3600, y: height - 160 },  // 崖前
      // 崖（3800-4000）の後
      { x: 4100, y: height - 140 },
      { x: 4350, y: height - 180 }
    ];

    // ステージ2はパターンを繰り返さず、上記の独自レイアウトを使用
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
    // ★ ステージ2では前半の敵をenemy_fastに変更、一部をenemy_greenに
    this.createEnemy(this.enemiesFast, 500, height - 64, 80, "enemyGreen", 160); // 緑（パトロール範囲2倍）
    this.createEnemy(this.enemiesFast, 800, height - 64, 80, "enemyFast");
    this.createEnemy(this.enemiesFast, 1200, height - 64, 80, "enemyFast");
    this.createEnemy(this.enemiesFast, 1600, height - 64, 80, "enemyGreen", 160); // 緑（パトロール範囲2倍）

    // 後半の敵（+2400 右にずらした位置、全て地面の高さ）
    this.createEnemy(this.enemiesSlow, 500 + 2400, height - 64, 40);
    this.createEnemy(this.enemiesFast, 800 + 2400, height - 64, 80, "enemyGreen", 160); // 緑（パトロール範囲2倍）
    this.createEnemy(this.enemiesSlow, 1200 + 2400, height - 64, 40);
    this.createEnemy(this.enemiesFast, 1600 + 2400, height - 64, 80);

    this.spikes = this.physics.add.staticGroup();

    // 前半のトゲ
    const spike1 = this.spikes.create(
      600,
      height - 32,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spike1.setOrigin(0.5, 1);
    spike1.setDisplaySize(32, 32);
    spike1.refreshBody();

    const spike2 = this.spikes.create(
      1100,
      height - 32,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spike2.setOrigin(0.5, 1);
    spike2.setDisplaySize(32, 32);
    spike2.refreshBody();

    // 後半のトゲ（+2400）
    const spike3 = this.spikes.create(
      600 + 2400,
      height - 32,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spike3.setOrigin(0.5, 1);
    spike3.setDisplaySize(32, 32);
    spike3.refreshBody();

    const spike4 = this.spikes.create(
      1100 + 2400,
      height - 32,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spike4.setOrigin(0.5, 1);
    spike4.setDisplaySize(32, 32);
    spike4.refreshBody();

    // ★ ステージ2限定: spike_high（幅2倍、高さ3倍）
    // platformと重ならない位置に配置
    const spikeHigh1 = this.spikes.create(
      1050,  // x=1200のplatformから離れた位置
      height - 32,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spikeHigh1.setOrigin(0.5, 1);
    spikeHigh1.setDisplaySize(64, 96); // 幅2倍、高さ3倍
    spikeHigh1.refreshBody();

    const spikeHigh2 = this.spikes.create(
      2300,  // 崖（2000-2200）を避けた位置
      height - 32,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spikeHigh2.setOrigin(0.5, 1);
    spikeHigh2.setDisplaySize(64, 96);
    spikeHigh2.refreshBody();

    // 後半のspike_high（+2400）
    const spikeHigh3 = this.spikes.create(
      1050 + 2400,
      height - 32,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spikeHigh3.setOrigin(0.5, 1);
    spikeHigh3.setDisplaySize(64, 96);
    spikeHigh3.refreshBody();

    const spikeHigh4 = this.spikes.create(
      4200,  // ゴール（x=4700）から離れた位置に移動
      height - 32,
      "spike"
    ) as Phaser.Physics.Arcade.Sprite;
    spikeHigh4.setOrigin(0.5, 1);
    spikeHigh4.setDisplaySize(64, 96);
    spikeHigh4.refreshBody();

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

    // ▼ コライダー／オーバーラップ設定

    // プレイヤーと足場
    this.physics.add.collider(this.player, this.platforms, () => {
      this.isOnGround = true;
      this.jumpCount = 0;
    });

    // 敵と足場
    this.physics.add.collider(this.enemiesSlow, this.platforms);
    this.physics.add.collider(this.enemiesFast, this.platforms);

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
    // ステージ3に遷移
    this.scene.start("GameScene3", {
      lives: this.lives,
      hp: this.hp,
      beans: this.beansCollected
    } as GameSceneData);
  }
}