using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Api.Migrations
{
    public partial class ReplaceParticipantPositionWithNextSpeakerFk : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NextSpeakerPosition",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "Position",
                table: "ConversationParticipants");

            migrationBuilder.AddColumn<int>(
                name: "NextSpeakerId",
                table: "Conversations",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_NextSpeakerId",
                table: "Conversations",
                column: "NextSpeakerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_ConversationParticipants_NextSpeakerId",
                table: "Conversations",
                column: "NextSpeakerId",
                principalTable: "ConversationParticipants",
                principalColumn: "Id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_ConversationParticipants_NextSpeakerId",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_NextSpeakerId",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "NextSpeakerId",
                table: "Conversations");

            migrationBuilder.AddColumn<byte>(
                name: "NextSpeakerPosition",
                table: "Conversations",
                type: "tinyint",
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "Position",
                table: "ConversationParticipants",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)0);
        }
    }
}
