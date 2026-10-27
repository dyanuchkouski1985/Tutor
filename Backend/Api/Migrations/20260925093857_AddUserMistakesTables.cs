using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Api.Migrations
{
    public partial class AddUserMistakesTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserMistakePatterns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Language = table.Column<int>(type: "int", nullable: false),
                    Category = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Rule = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Progress = table.Column<int>(type: "int", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastPracticeDate = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserMistakePatterns", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "UserMistakeOccurrences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PatternId = table.Column<int>(type: "int", nullable: false),
                    MessageId = table.Column<int>(type: "int", nullable: true),
                    Fragment = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Correction = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedDate = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserMistakeOccurrences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserMistakeOccurrences_ConversationMessages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "ConversationMessages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_UserMistakeOccurrences_UserMistakePatterns_PatternId",
                        column: x => x.PatternId,
                        principalTable: "UserMistakePatterns",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserMistakeOccurrences_MessageId",
                table: "UserMistakeOccurrences",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_UserMistakeOccurrences_PatternId",
                table: "UserMistakeOccurrences",
                column: "PatternId");

            migrationBuilder.CreateIndex(
                name: "IX_UserMistakePatterns_UserId_Language_Rule",
                table: "UserMistakePatterns",
                columns: new[] { "UserId", "Language", "Rule" },
                unique: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserMistakeOccurrences");

            migrationBuilder.DropTable(
                name: "UserMistakePatterns");
        }
    }
}
