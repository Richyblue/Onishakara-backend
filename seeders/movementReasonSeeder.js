const MovementReason=require("../models/MovementReason");

async function seedMovementReasons(){

const data=[

{

reason:"Restroom",

maximumDuration:15

},

{

reason:"Buy Materials",

maximumDuration:45

},

{

reason:"Bank",

maximumDuration:60,

requiresApproval:true

},

{

reason:"Official Assignment",

maximumDuration:180,

requiresApproval:true

},

{

reason:"Lunch Break",

maximumDuration:60

},

{

reason:"Personal",

maximumDuration:30,

requiresApproval:true

}

];

for(const item of data){

await MovementReason.findOrCreate({

where:{

reason:item.reason

},

defaults:item

});

}

console.log("Movement Reasons Seeded");

}

module.exports=seedMovementReasons;