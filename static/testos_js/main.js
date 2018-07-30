let url = 'http://labgw:8080/machines';
let url2 = 'http://localhost:8083/machines';

$(document).ready(function () {
    $("#jqGrid").jqGrid({
        url: "http://localhost:3000/test",
        mtype: "GET",
        styleUI : 'Bootstrap',
        datatype:"json",
        jsonReader: {
            root: function (obj) { return obj; },
            repeatitems : false,
        },
        loadonce: true,
        // colModel: [
        //     { label: 'machines', name: 'machines', key: true, width: 75 },
        //     // { label: 'Customer ID', name: 'CustomerID', width: 150 },
        //     // { label: 'Order Date', name: 'OrderDate', width: 150 },
        //     // { label: 'Freight', name: 'Freight', width: 150 },
        //     // { label:'Ship Name', name: 'ShipName', width: 150 }
        // ],
        viewrecords: true,
        height: 250,
        rowNum: 20,
        cmTemplate: {editable: true},
        pager: "#jqGridPager",


    });


});


function get_machines() {
    let res = [];

    // $.getJSON("http://localhost:3000/test", function(result){
    //     alert(result);
    //     // $.each(result, function(i, field){
    //     //     $("div").append(field + " ");
    //     // });
    // });
    //

    $.getJSON("http://localhost:3000/test", function(data) {
        $.each(data, function(index, element) {
            res.push(element);
            $('body').append($('<div>', {
                text: element.name
            }));
        });
    });

    return res;
}
