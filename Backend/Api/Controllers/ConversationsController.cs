using Api.Interfaces.Services;
using Api.Requests.Conversations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ConversationsController(IConversationService conversationService) : ControllerBase
{
    [HttpPost("[action]")]
    public async Task<IActionResult> Search(SearchConversationsRequest request)
    {
        return Ok(await conversationService.SearchAsync(request));
    }

    [HttpGet("{conversationId:int}")]
    public async Task<IActionResult> Get(int conversationId)
    {
        var conversation = await conversationService.GetAsync(conversationId);

        return conversation == null ? NotFound() : Ok(conversation);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateConversationRequest request)
    {
        return Ok(await conversationService.CreateAsync(request));
    }

    [HttpPost("[action]")]
    public async Task<IActionResult> Generate(GenerateConversationRequest request)
    {
        return Ok(await conversationService.GenerateAsync(request));
    }

    [HttpPut("{conversationId:int}")]
    public async Task<IActionResult> Update(int conversationId, UpdateConversationRequest request)
    {
        var result = await conversationService.UpdateAsync(conversationId, request);

        return result == null ? NotFound() : Ok(result);
    }

    [HttpPost("{conversationId:int}/[action]")]
    public async Task<IActionResult> Turn(int conversationId)
    {
        var turn = await conversationService.TurnAsync(conversationId);

        return turn == null ? NotFound() : Ok(turn);
    }

    [HttpPost("{conversationId:int}/[action]")]
    public async Task<IActionResult> Messages(int conversationId,
        SubmitConversationMessageRequest request)
    {
        var turn = await conversationService.PostMessageAsync(conversationId, request);

        return turn == null ? NotFound() : Ok(turn);
    }

    [HttpPost("{conversationId:int}/[action]")]
    public async Task<IActionResult> Format(int conversationId,
        FormatConversationMessageRequest request)
    {
        var result = await conversationService.FormatMessageAsync(conversationId, request);

        return result == null ? NotFound() : Ok(result);
    }

    [HttpDelete("{conversationId:int}")]
    public async Task<IActionResult> Delete(int conversationId)
    {
        return Ok(await conversationService.DeleteAsync(conversationId));
    }
}
