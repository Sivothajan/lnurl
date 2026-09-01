-- CreateTable
CREATE TABLE "lightning_pay_request_data" (
    "uuid" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "url" TEXT,
    "coin" TEXT NOT NULL DEFAULT 'BTC',
    "amount" BIGINT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'LIGHTNING',
    "prefix" TEXT,
    "payee_node" TEXT,
    "payment_hash" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "tag" TEXT,
    "comment" VARCHAR(255),
    "payer_data" JSONB,
    "payer_pubkey" VARCHAR(130),
    "nostr_pubkey" TEXT,
    "deposit_status" INTEGER,
    "deposit_data" JSONB,
    "deposit_checked_at" TIMESTAMPTZ(6),
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lightning_pay_request_data_pkey" PRIMARY KEY ("uuid")
);

-- CreateTable
CREATE TABLE "lightning_withdraw_request_data" (
    "k1" VARCHAR(64) NOT NULL,
    "address" TEXT NOT NULL,
    "url" TEXT,
    "coin" TEXT NOT NULL DEFAULT 'BTC',
    "amount" BIGINT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'LIGHTNING',
    "prefix" TEXT,
    "payee_node" TEXT,
    "payment_hash" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "withdraw_id" VARCHAR(255),
    "payout_status" INTEGER,
    "payout_submitted_at" TIMESTAMPTZ(6),
    "is_paid" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lightning_withdraw_request_data_pkey" PRIMARY KEY ("k1")
);

-- CreateIndex
CREATE INDEX "lightning_pay_request_data_is_paid_idx" ON "lightning_pay_request_data"("is_paid");

-- CreateIndex
CREATE INDEX "lightning_pay_request_data_created_at_idx" ON "lightning_pay_request_data"("created_at" DESC);

-- CreateIndex
CREATE INDEX "lightning_pay_request_data_payment_hash_idx" ON "lightning_pay_request_data"("payment_hash");

-- CreateIndex
CREATE INDEX "lightning_withdraw_request_data_is_paid_idx" ON "lightning_withdraw_request_data"("is_paid");

-- CreateIndex
CREATE INDEX "lightning_withdraw_request_data_created_at_idx" ON "lightning_withdraw_request_data"("created_at" DESC);

-- CreateIndex
CREATE INDEX "lightning_withdraw_request_data_payment_hash_idx" ON "lightning_withdraw_request_data"("payment_hash");
