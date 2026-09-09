using Microsoft.EntityFrameworkCore.Migrations;

namespace Api.Migrations
{
    public partial class RenameToLastLearningDateColumnInUserWordLearningProgressTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "StartLearningDate",
                table: "UserWordLearningProgresses",
                newName: "LastLearningDate");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "LastLearningDate",
                table: "UserWordLearningProgresses",
                newName: "StartLearningDate");
        }
    }
}
