using Microsoft.EntityFrameworkCore.Migrations;

namespace Api.Migrations
{
    public partial class AddPronunciationFieldsToWordTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PronunciationContentType",
                table: "Words",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "PronunciationData",
                table: "Words",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PronunciationExtension",
                table: "Words",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "PronunciationLength",
                table: "Words",
                type: "bigint",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PronunciationContentType",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "PronunciationData",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "PronunciationExtension",
                table: "Words");

            migrationBuilder.DropColumn(
                name: "PronunciationLength",
                table: "Words");
        }
    }
}
