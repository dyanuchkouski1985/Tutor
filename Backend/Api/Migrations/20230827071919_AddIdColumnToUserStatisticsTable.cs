using Microsoft.EntityFrameworkCore.Migrations;

namespace Api.Migrations
{
    public partial class AddIdColumnToUserStatisticsTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserStatistics",
                table: "UserStatistics");

            migrationBuilder.AddColumn<int>(
                name: "Id",
                table: "UserStatistics",
                type: "int",
                nullable: false,
                defaultValue: 0)
                .Annotation("SqlServer:Identity", "1, 1");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserStatistics",
                table: "UserStatistics",
                column: "Id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserStatistics",
                table: "UserStatistics");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "UserStatistics");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserStatistics",
                table: "UserStatistics",
                columns: new[] { "UserId", "Language" });
        }
    }
}
