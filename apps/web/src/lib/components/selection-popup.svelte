<script>
  export let text = "";
  export let x = 0;
  export let y = 0;
  export let visible = false;
</script>

{#if visible}
  <div 
    class="selection-popup" 
    style="top: {y}px; left: {x}px;"
  >
    <div class="content">
      <strong>Selected:</strong> {text}
      </div>
  </div>
{/if}

<style>
  .selection-popup {
    position: absolute;
    transform: translate(-50%, -100%); /* Center horizontally, sit above point */
    background: white;
    border: 1px solid #ccc;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 10px;
    border-radius: 8px;
    z-index: 1000;
    min-width: 100px;
    pointer-events: auto;
  }
  
  /* Simple arrow at the bottom */
  .selection-popup::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
    border-color: white transparent transparent transparent;
  }
</style>