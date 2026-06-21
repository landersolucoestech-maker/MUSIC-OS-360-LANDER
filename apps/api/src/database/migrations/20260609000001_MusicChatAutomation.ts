import { MigrationInterface, QueryRunner } from 'typeorm';

export class MusicChatAutomation20260609000001 implements MigrationInterface {
  name = 'MusicChatAutomation20260609000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS musicchat_automation_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL UNIQUE,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        welcome_message TEXT NOT NULL,
        main_menu_message TEXT NOT NULL,
        menu_options JSONB NOT NULL DEFAULT '[]'::jsonb,
        templates JSONB NOT NULL DEFAULT '[]'::jsonb,
        required_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
        optional_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
        invalid_option_message TEXT NOT NULL,
        absence_message TEXT NOT NULL,
        out_of_hours_message TEXT NOT NULL,
        closing_message TEXT NOT NULL,
        return_to_menu_rule JSONB NOT NULL DEFAULT '{}'::jsonb,
        escalation_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
        notification_channels JSONB NOT NULL DEFAULT '{}'::jsonb,
        supervisor_user_id VARCHAR(255),
        manager_user_id VARCHAR(255),
        updated_by VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS musicchat_automation_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        event_type VARCHAR(100) NOT NULL,
        summary TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        actor_id VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS musicchat_automation_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        level VARCHAR(50) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        recipient_user_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        body TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT uq_musicchat_escalation_notification UNIQUE (tenant_id, conversation_id, level)
      );
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_musicchat_automation_events_conv ON musicchat_automation_events (tenant_id, conversation_id, created_at DESC);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_musicchat_automation_events_type ON musicchat_automation_events (tenant_id, event_type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_musicchat_automation_notifications_status ON musicchat_automation_notifications (tenant_id, status);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS musicchat_automation_notifications CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS musicchat_automation_events CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS musicchat_automation_settings CASCADE;`);
  }
}
