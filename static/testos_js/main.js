$(document).ready(function () {
    $("#jqGrid").jqGrid({
        mtype: "GET",
        url: "http://localhost:3000/machines",
        datatype: 'json',
        styleUI : 'Bootstrap',
        // datatype: "local",
        // data: get_machines(),
        loadonce: true,
        colModel: [
            { label: 'machines', name: 'name', key: true, width: 75 },
            // { label: 'Customer ID', name: 'CustomerID', width: 150 },
            // { label: 'Order Date', name: 'OrderDate', width: 150 },
            // { label: 'Freight', name: 'Freight', width: 150 },
            // { label:'Ship Name', name: 'ShipName', width: 150 }
        ],
        viewrecords: true,
        beforeProcessing: function (data) {
            // data.rows = ...;
            // data.page = ...;
        },
        height: 250,
        rowNum: 20,
        cmTemplate: {editable: true},
        pager: "#jqGridPager",


    });


});


function get_machines() {
    let res = [];

    $.getJSON("http://localhost:3000/machines", function(data) {
        $.each(data, function(index, element) {
            res.push(element);
            $('body').append($('<div>', {
                text: element.name
            }));
        });
    });

    return res;
}
