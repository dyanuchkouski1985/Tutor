using Microsoft.EntityFrameworkCore.Migrations;

namespace Api.Migrations
{
    public partial class MoveLanguageColumnToWordsTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Language",
                table: "Translations");

            migrationBuilder.AddColumn<int>(
                name: "Language",
                table: "Words",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Language",
                table: "Words");

            migrationBuilder.AddColumn<int>(
                name: "Language",
                table: "Translations",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }
    }
}
